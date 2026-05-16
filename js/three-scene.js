import * as THREE from 'three';
import { CellLayoutEngine } from './cell-layout-engine.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const CELL_TEMPLATES = {
    Animalia: {
        body: {
            geometry: 'sphere',
            params: [1.2, 32, 32],
            color: 0x88aaff,
            emissive: 0x224466,
            transparent: true,
            opacity: 0.85
        }
    },
    Plantae: {
        body: {
            geometry: 'cylinder',
            params: [1.0, 1.0, 1.5, 6],
            color: 0x6b8e23,
            emissive: 0x336600,
            transparent: true,
            opacity: 0.7
        }
    }
};

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

        const width = this.container.clientWidth || 1;
        const height = this.container.clientHeight || 1;
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(3, 2, 5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.localClippingEnabled = true;
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
        this.organelleMeshMap = new Map();
        this.isFallback = false;
        this.clippingPlanes = [];
        this.animationId = null;
        this._isRendering = false;
        this._idleTimer = null;

        this._resizeHandler = () => this.forceResize();

        this.setupLights();
        this.setupResizeHandler();
        this.setupSmartRendering();
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
        window.addEventListener('resize', this._resizeHandler);
    }

    forceResize() {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) return;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    // Renderização sob demanda: loop pausado até interação ou autoRotate
    setupSmartRendering() {
        const startLoop = () => {
            if (!this._isRendering) {
                this._isRendering = true;
                this._animate();
            }
        };

        const stopLoopAfterIdle = () => {
            // Só para se autoRotate estiver desligado
            if (this.controls.autoRotate) return;
            if (this._idleTimer) clearTimeout(this._idleTimer);
            this._idleTimer = setTimeout(() => {
                if (!this.controls.autoRotate) {
                    this._isRendering = false;
                }
            }, 2000); // 2s após última interação
        };

        this.controls.addEventListener('start', startLoop);
        this.controls.addEventListener('end', stopLoopAfterIdle);
        
        // NOTA: Removemos o timer inicial que desligava o loop antes do primeiro modelo.
        // O loop será ativado pelo loadModel via startRenderLoop().
    }

    _animate() {
        if (!this._isRendering) {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            return;
        }
        this.animationId = requestAnimationFrame(() => this._animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    // Início manual do loop (usado ao ativar autoRotate programaticamente)
    startRenderLoop() {
        if (!this._isRendering) {
            this._isRendering = true;
            this._animate();
        }
    }

    stopRenderLoop() {
        this._isRendering = false;
    }

    loadModel(url, organelasList = [], cellId = 'unknown', cellType = 'Animalia') {
        return new Promise((resolve, reject) => {
            if (this.currentModel) {
                this.scene.remove(this.currentModel);
                this.disposeModel(this.currentModel);
                this.currentModel = null;
            }
            this.meshesMap.clear();
            this.organelleMeshMap.clear();
            this.isFallback = false;

            this.loader.load(url,
                (gltf) => {
                    this.currentModel = gltf.scene;
                    this.isFallback = false;
                    this._processGLTFModel(organelasList);
                    this.scene.add(this.currentModel);
                    
                    // =========================================================
                    // 🔥 CORREÇÃO DEFINITIVA: renderização imediata + loop ativo
                    // =========================================================
                    this.forceResize();                       // garante dimensões corretas
                    this.renderer.render(this.scene, this.camera);  // primeiro frame
                    if (!this._isRendering) {
                        this.startRenderLoop();               // mantém interatividade
                    }
                    // =========================================================
                    
                    if (this.clippingPlanes.length > 0) this.applyClippingPlanesToModel(this.currentModel);
                    resolve({ usedFallback: false });
                },
                undefined,
                (error) => {
                    console.warn(`[Fallback] Não foi possível carregar ${url}: ${error.message}. Gerando modelo substituto.`);
                    const fallbackGroup = this.createFallbackModel(organelasList, cellId, cellType);
                    this.currentModel = fallbackGroup;
                    this.isFallback = true;
                    this._processFallbackOrganelleMap(organelasList);
                    this.scene.add(this.currentModel);
                    
                    // Mesma correção para o fallback
                    this.forceResize();
                    this.renderer.render(this.scene, this.camera);
                    if (!this._isRendering) this.startRenderLoop();
                    
                    if (this.clippingPlanes.length > 0) this.applyClippingPlanesToModel(this.currentModel);
                    resolve({ usedFallback: true });
                }
            );
        });
    }

    _processGLTFModel(organelasList) {
        this.currentModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = false;
                if (child.material) child.material.side = THREE.DoubleSide;
                if (child.name) {
                    child.userData.source = 'gltf';
                    this.meshesMap.set(child.name, child);
                }
            }
        });

        organelasList.forEach(org => {
            const names = [];
            const target = org.mesh_name.toLowerCase();
            this.meshesMap.forEach((mesh, name) => {
                if (name.toLowerCase().includes(target)) {
                    names.push(name);
                }
            });
            if (names.length > 0) {
                this.organelleMeshMap.set(org.id, names);
            }
        });
    }

    createFallbackModel(organelasList, cellId, cellType = 'Animalia') {
        const group = new THREE.Group();
        group.userData = { isFallback: true, cellId, cellType };
        this.meshesMap.clear();

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

        const manifest = CellLayoutEngine.generateSceneManifest(organelasList, cellType);

        manifest.forEach(item => {
            const orgTemplate = ORGANELLE_TEMPLATES[item.id] || ORGANELLE_TEMPLATES.Default;
            const GeomConstructor = THREE[orgTemplate.geometry.type];
            if (!GeomConstructor) {
                console.warn(`Geometria desconhecida: ${orgTemplate.geometry.type}`);
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

        console.log(`[Fallback] Modelo gerado para ${cellId} (${cellType}) com ${this.meshesMap.size} malhas.`);
        return group;
    }

    _processFallbackOrganelleMap(organelasList) {
        this.organelleMeshMap.clear();
        organelasList.forEach(org => {
            const names = [];
            this.meshesMap.forEach((mesh, name) => {
                if (mesh.userData.organelleId === org.id) {
                    names.push(name);
                }
            });
            if (names.length > 0) {
                this.organelleMeshMap.set(org.id, names);
            }
        });
    }

    disposeModel(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(mat => {
                        for (const key in mat) {
                            const value = mat[key];
                            if (value && value.isTexture) {
                                value.dispose();
                            }
                        }
                        mat.dispose();
                    });
                }
            }
        });
    }

    // Limpa a cena removendo o modelo atual sem destruir o renderer (para reciclagem)
    clearScene() {
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
            this.disposeModel(this.currentModel);
            this.currentModel = null;
        }
        this.meshesMap.clear();
        this.organelleMeshMap.clear();
        this.clippingPlanes = [];
    }

    applyClippingPlanesToModel(model) {
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(mat => {
                    mat.clippingPlanes = this.clippingPlanes;
                    mat.needsUpdate = true;
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

    isolateOrganelle(organelleId) {
        if (!this.currentModel) return;
        const targetNames = this.organelleMeshMap.get(organelleId) || [];
        const targetSet = new Set(targetNames);

        this.currentModel.traverse((child) => {
            if (child.isMesh) {
                child.visible = targetSet.has(child.name);
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
        if (enable) {
            this.startRenderLoop();
        } else {
            // O smart rendering já vai parar após idle
        }
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
        this._isRendering = false;
        if (this._idleTimer) clearTimeout(this._idleTimer);
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }
        if (this.currentModel) {
            this.disposeModel(this.currentModel);
            this.scene.remove(this.currentModel);
        }
        this.renderer.dispose();
        this.controls.dispose();
        if (this.container && this.renderer.domElement && this.container.contains(this.renderer.domElement)) {
            this.container.removeChild(this.renderer.domElement);
        }
    }
}