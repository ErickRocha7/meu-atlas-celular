import * as THREE from 'three';
import { CellLayoutEngine } from './cell-layout-engine.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --------------------------------------------------------------
// Configuração declarativa dos tipos de célula (corpo)
// --------------------------------------------------------------
const CELL_TEMPLATES = {
    Animalia: {
        body: {
            geometry: 'sphere',
            params: [1.2, 32, 32],
            color: 0x88aaff,
            emissive: 0x224466,
            transparent: true,
            opacity: 0.85
        },
        organelleColors: [0xff6666, 0x66ff66, 0xffaa66, 0xff66ff, 0x66ffff],
        organelleRadius: 0.18,
        organelleCountOffset: 0
    },
    Plantae: {
        body: {
            geometry: 'cylinder',
            params: [1.0, 1.0, 1.5, 6],
            color: 0x6b8e23,
            emissive: 0x336600,
            transparent: true,
            opacity: 0.7
        },
        organelleColors: [0x88ff88, 0xffaa66, 0xff8888, 0x88aaff],
        organelleRadius: 0.2,
        organelleCountOffset: 1
    }
};

// --------------------------------------------------------------
// Templates visuais para organelas (geometria, material)
// --------------------------------------------------------------
const ORGANELLE_TEMPLATES = {
    nucleus: {
        geometry: { type: 'SphereGeometry', params: [0.35, 32, 32] },
        material: { color: 0xe71d36, roughness: 0.3, metalness: 0.2 },
        isCentral: true
    },
    mitochondria: {
        geometry: { type: 'CapsuleGeometry', params: [0.08, 0.18, 4, 8] },
        material: { color: 0xffb703, roughness: 0.2, metalness: 0.5 },
        isCentral: false
    },
    chloroplast: {
        geometry: { type: 'SphereGeometry', params: [0.22, 16, 16], scale: [1.2, 0.6, 1.2] },
        material: { color: 0x38b000, roughness: 0.4, metalness: 0.1 },
        isCentral: false
    },
    vacuole: {
        geometry: { type: 'BoxGeometry', params: [0.6, 0.9, 0.6] },
        material: { color: 0x00b4d8, roughness: 0.2, metalness: 0.1 },
        isCentral: false
    },
    ribosome: {
        geometry: { type: 'SphereGeometry', params: [0.04, 8, 8] },
        material: { color: 0x8d99ae, roughness: 0.9, metalness: 0.1 },
        isCentral: false
    },
    golgi: {
        geometry: { type: 'BoxGeometry', params: [0.4, 0.1, 0.4] },
        material: { color: 0xff4dff, roughness: 0.4, metalness: 0.2 },
        isCentral: false
    },
    lysosome: {
        geometry: { type: 'SphereGeometry', params: [0.12, 16, 16] },
        material: { color: 0x9b5de5, roughness: 0.3, metalness: 0.1 },
        isCentral: false
    },
    peroxisome: {
        geometry: { type: 'SphereGeometry', params: [0.1, 16, 16] },
        material: { color: 0xf15bb5, roughness: 0.3, metalness: 0.1 },
        isCentral: false
    },
    centriole: {
        geometry: { type: 'CylinderGeometry', params: [0.05, 0.05, 0.2, 8] },
        material: { color: 0x00f5d4, roughness: 0.5, metalness: 0.5 },
        isCentral: false
    },
    Default: {
        geometry: { type: 'SphereGeometry', params: [0.1, 12, 12] },
        material: { color: 0xa8dadc, roughness: 0.5, metalness: 0.1 },
        isCentral: false
    }
};

export class ThreeSceneManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error(`Container ${containerId} not found`);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xfafcff);

        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.set(3, 2, 5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 1.5;
        this.controls.enableZoom = true;
        this.controls.enablePan = true;

        this.loader = new GLTFLoader();
        this.currentModel = null;
        this.meshesMap = new Map();
        this.clippingPlanes = [];
        this.animationId = null;

        this.setupLights();
        this.setupResizeHandler();
        this.startAnimationLoop();
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0x404060);
        this.scene.add(ambient);

        const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
        mainLight.position.set(3, 5, 2);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 1024;
        mainLight.shadow.mapSize.height = 1024;
        this.scene.add(mainLight);

        const fillLight = new THREE.PointLight(0xccaa88, 0.5);
        fillLight.position.set(1, 2, 3);
        this.scene.add(fillLight);

        const backLight = new THREE.PointLight(0x88aaff, 0.3);
        backLight.position.set(-2, 1, -3);
        this.scene.add(backLight);
    }

    setupResizeHandler() {
        window.addEventListener('resize', () => {
            if (!this.container) return;
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        });
    }

    startAnimationLoop() {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        };
        animate();
    }

    loadModel(url, organelasList = [], cellId = 'unknown', cellType = 'Animalia') {
        return new Promise((resolve, reject) => {
            if (this.currentModel) {
                this.scene.remove(this.currentModel);
                this.disposeModel(this.currentModel);
            }

            this.loader.load(url, (gltf) => {
                this.currentModel = gltf.scene;
                this.meshesMap.clear();

                // 🔍 VALIDAÇÃO DE MISMATCH (Resolver)
                const gltfMeshNames = new Set();
                this.currentModel.traverse((child) => {
                    if (child.isMesh && child.name) {
                        gltfMeshNames.add(child.name);
                    }
                });
                organelasList.forEach(org => {
                    if (!gltfMeshNames.has(org.mesh_name)) {
                        console.warn(`[Mismatch] Organela '${org.id}' com mesh_name '${org.mesh_name}' não encontrada no modelo GLB.`);
                    }
                });

                // Processamento padrão (metadados, adição à cena)
                this.currentModel.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = false;
                        if (child.material) child.material.side = THREE.DoubleSide;
                        if (child.name) {
                            if (!child.userData.source) child.userData.source = 'gltf';
                            this.meshesMap.set(child.name, child);
                        }
                    }
                });

                this.scene.add(this.currentModel);
                if (this.clippingPlanes.length > 0) this.applyClippingPlanesToModel(this.currentModel);
                resolve(gltf);
            }, undefined, (error) => {
                console.warn(`[Fallback] Não foi possível carregar ${url} para célula ${cellId}. Erro: ${error.message}. Gerando modelo substituto.`);
                const fallbackGroup = this.createFallbackModel(organelasList, cellId, cellType);
                this.currentModel = fallbackGroup;
                this.scene.add(this.currentModel);
                if (this.clippingPlanes.length > 0) this.applyClippingPlanesToModel(this.currentModel);
                resolve({ scene: fallbackGroup, animations: [] });
            });
        });
    }

    /**
     * Cria o modelo fallback usando o CellLayoutEngine e templates visuais.
     * O manifesto gerado pelo engine define posições (fixas para núcleo/vacúolo, aleatórias para as demais).
     */
    createFallbackModel(organelasList, cellId, cellType = 'Animalia') {
        const group = new THREE.Group();
        group.userData = { isFallback: true, cellId, cellType };
        this.meshesMap.clear();

        // 1. Corpo da célula (conforme CELL_TEMPLATES)
        const template = CELL_TEMPLATES[cellType] || CELL_TEMPLATES.Animalia;
        let bodyGeometry;
        switch (template.body.geometry) {
            case 'sphere':
                bodyGeometry = new THREE.SphereGeometry(...template.body.params);
                break;
            case 'cylinder':
                bodyGeometry = new THREE.CylinderGeometry(...template.body.params);
                break;
            default:
                bodyGeometry = new THREE.SphereGeometry(1.2, 32, 32);
        }
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: template.body.color,
            emissive: template.body.emissive,
            roughness: 0.3,
            metalness: 0.1,
            transparent: template.body.transparent,
            opacity: template.body.opacity,
            side: THREE.DoubleSide
        });
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        bodyMesh.name = "cell_body";
        bodyMesh.castShadow = true;
        bodyMesh.userData = { type: 'body', source: 'procedural', cellType };
        group.add(bodyMesh);
        this.meshesMap.set("cell_body", bodyMesh);

        // 2. Gerar manifesto de layout via CellLayoutEngine
        const manifest = CellLayoutEngine.generateSceneManifest(organelasList, cellType);

        // 3. Para cada item do manifesto, instanciar a organela usando ORGANELLE_TEMPLATES
        manifest.forEach(item => {
            const orgTemplate = ORGANELLE_TEMPLATES[item.id] || ORGANELLE_TEMPLATES.Default;

            // Construtor da geometria
            const GeomConstructor = THREE[orgTemplate.geometry.type];
            if (!GeomConstructor) {
                console.warn(`Tipo de geometria desconhecido: ${orgTemplate.geometry.type}`);
                return;
            }
            const geometry = new GeomConstructor(...orgTemplate.geometry.params);

            const material = new THREE.MeshStandardMaterial({
                ...orgTemplate.material,
                side: THREE.DoubleSide
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = item.meshName;
            mesh.position.set(item.position[0], item.position[1], item.position[2]);
            mesh.rotation.set(item.rotation[0], item.rotation[1], item.rotation[2]);
            mesh.castShadow = true;

            if (orgTemplate.geometry.scale) {
                mesh.scale.set(...orgTemplate.geometry.scale);
            }
            if (item.scale) {
                mesh.scale.set(...item.scale);
            }

            // Metadados unificados
            mesh.userData = {
                organelleId: item.id,
                type: item.meshName,
                source: 'procedural',
                descricao: item.description,
                layoutGroup: item.layoutGroup
            };

            group.add(mesh);
            this.meshesMap.set(mesh.name, mesh);
        });

        console.log(`[Fallback] Modelo gerado para ${cellId} (${cellType}) com ${this.meshesMap.size} malhas (${manifest.length} organelas).`);
        return group;
    }

    disposeModel(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(mat => mat.dispose());
                }
            }
        });
    }

    applyClippingPlanesToModel(model) {
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(mat => {
                    mat.clippingPlanes = this.clippingPlanes;
                });
            }
        });
    }

    enableCrossSection(enable, planeY = 0) {
        if (enable) {
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
            this.clippingPlanes = [plane];
        } else {
            this.clippingPlanes = [];
        }
        if (this.currentModel) {
            this.applyClippingPlanesToModel(this.currentModel);
        }
    }

    isolateOrganelle(meshName) {
        if (!this.currentModel) return;
        this.currentModel.traverse((child) => {
            if (child.isMesh) {
                // Por simplicidade, isola apenas o nome exato (sem prefixo)
                child.visible = (child.name === meshName);
            }
        });
    }

    resetVisibility() {
        if (!this.currentModel) return;
        this.currentModel.traverse((child) => {
            if (child.isMesh) child.visible = true;
        });
    }

    enableAutoRotate(enable) {
        this.controls.autoRotate = enable;
    }

    resetCamera() {
        this.camera.position.set(3, 2, 5);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    downloadModel(modelUrl) {
        const a = document.createElement('a');
        a.href = modelUrl;
        a.download = modelUrl.split('/').pop();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    dispose() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this.currentModel) {
            this.disposeModel(this.currentModel);
            this.scene.remove(this.currentModel);
        }
        this.renderer.dispose();
        this.controls.dispose();
        if (this.container.contains(this.renderer.domElement)) {
            this.container.removeChild(this.renderer.domElement);
        }
    }
}