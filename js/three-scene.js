// three-scene.js (inclui a classe ThreeSceneManager e o script principal de inicialização)
import * as THREE from 'three';
import { CellLayoutEngine } from './cell-layout-engine.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FieldExtractor } from './field-extractor.js';
import * as SDF from './sdf-library.js';

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
            params: [1.0, 1.0, 1.5, 32],
            color: 0x6b8e23,
            emissive: 0x336600,
            transparent: true,
            opacity: 0.7
        }
    }
};

class OrganelleEntity {
    constructor(id, sdfDef, materialConfig, layoutParams = {}) {
        this.id = id;
        this.rootGroup = new THREE.Group();
        this.sdfDef = sdfDef;
        this.materialConfig = materialConfig;
        this.layoutParams = layoutParams;
        this.meshes = [];
    }

    generateGeometry(size, resolution = 28) {
        while (this.rootGroup.children.length > 0) {
            this.rootGroup.remove(this.rootGroup.children[0]);
        }
        this.meshes = [];
        const extractor = new FieldExtractor(this.sdfDef, resolution, size, 0, true);
        const material = new THREE.MeshStandardMaterial({
            ...this.materialConfig,
            side: THREE.DoubleSide
        });
        const mesh = extractor.createMesh(material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.organelleId = this.id;
        this.rootGroup.add(mesh);
        this.meshes.push(mesh);
    }
}

const ORGANELLE_ENTITY_FACTORIES = {
    nucleus: (layoutParams) => {
        const sdf = (p) => {
            const r = Math.hypot(p.x, p.y, p.z);
            const freq = 24.0;
            const padraoPoros = Math.sin(p.x * freq) * Math.sin(p.y * freq) * Math.sin(p.z * freq);
            const envoltorioExterno = (r - 0.6) + (Math.max(0, padraoPoros) * 0.015);
            const nucleolo = r - 0.22;
            const espessura = 0.04;
            const paredeOca = Math.max(envoltorioExterno, -(r - (0.6 - espessura)));
            const nucleoCompleto = Math.min(paredeOca, nucleolo);
            const corte = Math.max(p.x, p.y, -p.z);
            return Math.max(nucleoCompleto, -corte);
        };
        return new OrganelleEntity('nucleus', sdf, {
            color: 0xdf9b75,
            roughness: 0.55,
            metalness: 0.0,
            emissive: 0x2d1408
        }, layoutParams);
    },

    golgi: (layoutParams) => {
        const group = new THREE.Group();
        group.userData.organelleId = 'golgi';
        const numSáculos = 5;
        const escalaAmostragem = 0.5;

        for (let i = 0; i < numSáculos; i++) {
            const offsetCamada = (i - numSáculos / 2) * 0.05;
            const saculoSdf = (p) => {
                const raioHorizontalQuadrado = (p.x * p.x + p.z * p.z);
                const raioHorizontal = Math.sqrt(raioHorizontalQuadrado);
                const fatorCurvaturaArco = 0.8;
                const espacoCurvadoY = p.y + (raioHorizontalQuadrado * fatorCurvaturaArco) - offsetCamada;
                const larguraX = 0.42;
                const espessuraY = 0.008;
                const profundidadeZ = 0.25;
                const cisternaBase = SDF.sdBox(
                    { x: p.x, y: espacoCurvadoY, z: p.z },
                    { x: larguraX, y: espessuraY, z: profundidadeZ }
                );
                const pontoInicioDilatacao = 0.32;
                const intensidadeGomo = 0.09;
                const abaDilatada = Math.max(0.0, raioHorizontal - pontoInicioDilatacao) * intensidadeGomo;
                return (cisternaBase - 0.012) - abaDilatada;
            };
            const saculoEntity = new OrganelleEntity('golgi', saculoSdf, {
                color: 0x8ba3cb,
                roughness: 0.42,
                metalness: 0.05,
                emissive: 0x0c1524
            });
            saculoEntity.generateGeometry(escalaAmostragem, 72);
            saculoEntity.rootGroup.position.set(0, (i - numSáculos / 2) * 0.055, offsetCamada * 0.3);
            group.add(saculoEntity.rootGroup);
        }

        const vesiculaSdf = (p) => SDF.sdSphere(p, 0.028);
        const posicoesVesiculas = [
            [0.55, 0.12, 0.1],
            [-0.52, -0.02, -0.1],
            [0.45, -0.1, 0.22],
            [0.38, 0.2, -0.15]
        ];
        posicoesVesiculas.forEach(pos => {
            const vesEntity = new OrganelleEntity('golgi', vesiculaSdf, {
                color: 0x8ba3cb,
                roughness: 0.42
            });
            vesEntity.generateGeometry(escalaAmostragem, 16);
            vesEntity.rootGroup.position.set(...pos);
            group.add(vesEntity.rootGroup);
        });

        return { rootGroup: group, id: 'golgi', isGroup: true };
    },

    rough_endoplasmic_reticulum: (layoutParams) => {
        const sdf = (p) => {
            const r = Math.hypot(p.x, p.y, p.z);
            const freqLabirinto = 14.0;
            const giroideSinuosa = Math.sin(p.x * freqLabirinto) * Math.cos(p.y * freqLabirinto) +
                                   Math.sin(p.y * freqLabirinto) * Math.cos(p.z * freqLabirinto) +
                                   Math.sin(p.z * freqLabirinto) * Math.cos(p.x * freqLabirinto);
            const espessuraMembrana = 0.015;
            const membranasLabirinticas = Math.abs(giroideSinuosa) - espessuraMembrana;
            const limiteInternoNucleo = 0.45;
            const limiteExternoCitoplasma = 0.85;
            const zonaConfinamento = Math.max(r - limiteExternoCitoplasma, -(r - limiteInternoNucleo));
            const reticuloEstrutura = Math.max(membranasLabirinticas, zonaConfinamento);
            const freqRibossomos = 70.0;
            const relevoRugoso = Math.sin(p.x * freqRibossomos) *
                                 Math.sin(p.y * freqRibossomos) *
                                 Math.sin(p.z * freqRibossomos) * 0.005;
            return reticuloEstrutura + relevoRugoso;
        };
        return new OrganelleEntity('rough_endoplasmic_reticulum', sdf, {
            color: 0xd9a762,
            roughness: 0.82,
            metalness: 0.0,
            emissive: 0x221100
        }, layoutParams);
    },

    mitochondria: (layoutParams) => {
        const sdf = (p) => {
            const pRot = { x: p.y, y: p.x, z: p.z };
            const raioCapsula = 0.16;
            const meiaAltura = 0.35;
            const membranaExterna = SDF.sdCapsule(pRot, raioCapsula, meiaAltura);
            const caixaCorte = SDF.sdBox(
                { x: pRot.x, y: pRot.y - 0.18, z: pRot.z },
                { x: 0.3, y: 0.12, z: 0.2 }
            );
            const cascaCortadaExposta = Math.max(membranaExterna, -caixaCorte);
            const freqCristas = 22.0;
            const espessuraCrista = 0.02;
            const padraoOndas = Math.abs(Math.cos(pRot.x * freqCristas)) - espessuraCrista;
            const confinamentoCristas = SDF.sdCapsule(pRot, raioCapsula - 0.02, meiaAltura - 0.02);
            const cristasInternas = Math.max(padraoOndas, confinamentoCristas);
            return Math.min(cascaCortadaExposta, cristasInternas);
        };
        return new OrganelleEntity('mitochondria', sdf, {
            color: 0xdf846b,
            roughness: 0.45,
            metalness: 0.02,
            emissive: 0x330d06
        }, layoutParams);
    },

    centriole: (layoutParams) => {
        const group = new THREE.Group();
        group.userData.organelleId = 'centriole';
        const escalaCentriolo = 0.45;

        const tuboCentrioloSdf = (p) => {
            const raioHorizontal = Math.hypot(p.x, p.z);
            const alturaLimite = Math.abs(p.y) - 0.28;
            const raioMedio = 0.14;
            const espessuraParede = Math.abs(raioHorizontal - raioMedio) - 0.025;
            const anguloRadial = Math.atan2(p.z, p.x);
            const estrias = Math.cos(anguloRadial * 9.0) * 0.015;
            const tuboEstriado = espessuraParede + estrias;
            return Math.max(tuboEstriado, alturaLimite);
        };

        const materialConfig = {
            color: 0x6bbbb2,
            roughness: 0.45,
            metalness: 0.05,
            emissive: 0x0a2421
        };

        const c1 = new OrganelleEntity('centriole', tuboCentrioloSdf, materialConfig);
        c1.generateGeometry(escalaCentriolo, 36);
        c1.rootGroup.position.set(0, 0.08, 0);
        group.add(c1.rootGroup);

        const c2 = new OrganelleEntity('centriole', tuboCentrioloSdf, materialConfig);
        c2.generateGeometry(escalaCentriolo, 36);
        c2.rootGroup.rotation.set(Math.PI / 2, 0, Math.PI / 2);
        c2.rootGroup.position.set(0.16, -0.12, 0.16);
        group.add(c2.rootGroup);

        return { rootGroup: group, id: 'centriole', isGroup: true };
    },

    chloroplast: (layoutParams) => {
        const sdf = (p) => SDF.sdSphere({ x: p.x, y: p.y * 3.0, z: p.z }, 0.8);
        return new OrganelleEntity('chloroplast', sdf, {
            color: 0x2dc60d,
            roughness: 0.4,
            metalness: 0.0,
            emissive: 0x0a3300
        }, layoutParams);
    },

    vacuole: (layoutParams) => {
        const sdf = (p) => SDF.sdBox(p, { x: 0.8, y: 0.9, z: 0.8 });
        return new OrganelleEntity('vacuole', sdf, {
            color: 0x00b4d8,
            roughness: 0.1,
            metalness: 0.0,
            transmission: 0.6,
            thickness: 0.5,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        }, layoutParams);
    },

    ribosome: (layoutParams) => {
        const sdf = (p) => SDF.sdSphere(p, 0.3);
        return new OrganelleEntity('ribosome', sdf, {
            color: 0x8d99ae,
            roughness: 0.9,
            metalness: 0.0
        }, layoutParams);
    },

    lysosome: (layoutParams) => {
        const sdf = (p) => SDF.sdSphere(p, 0.7);
        return new OrganelleEntity('lysosome', sdf, {
            color: 0x9b5de5,
            roughness: 0.4,
            metalness: 0.0,
            transmission: 0.3,
            transparent: true,
            side: THREE.DoubleSide
        }, layoutParams);
    },

    peroxisome: (layoutParams) => {
        const sdf = (p) => SDF.sdSphere(p, 0.6);
        return new OrganelleEntity('peroxisome', sdf, {
            color: 0xf15bb5,
            roughness: 0.4,
            metalness: 0.0
        }, layoutParams);
    },

    Default: (layoutParams) => {
        const sdf = (p) => SDF.sdSphere(p, 0.5);
        return new OrganelleEntity('unknown', sdf, {
            color: 0xa8dadc,
            roughness: 0.5,
            metalness: 0.0
        }, layoutParams);
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
        this.renderer.physicallyCorrectLights = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

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
        this.organelleEntityMap = new Map();
        this.organelleMeshMap = new Map();
        this.isFallback = false;
        this.clippingPlanes = [];
        this.animationId = null;
        this._isRendering = false;
        this._idleTimer = null;
        this._startTime = Date.now();

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

    setupSmartRendering() {
        const startLoop = () => {
            if (!this._isRendering) {
                this._isRendering = true;
                this._animate();
            }
        };
        const stopLoopAfterIdle = () => {
            if (this.controls.autoRotate) return;
            if (this._idleTimer) clearTimeout(this._idleTimer);
            this._idleTimer = setTimeout(() => {
                if (!this.controls.autoRotate) {
                    this._isRendering = false;
                }
            }, 2000);
        };
        this.controls.addEventListener('start', startLoop);
        this.controls.addEventListener('end', stopLoopAfterIdle);
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

        const time = Date.now() - this._startTime;
        this.scene.traverse(obj => {
            if (obj.userData?.isMitochondriaGroup && obj.material?.transmission !== undefined) {
                obj.material.transmission = 0.45 + Math.sin(time * 0.002) * 0.08;
            }
        });

        this.renderer.render(this.scene, this.camera);
    }

    startRenderLoop() {
        if (this._idleTimer) clearTimeout(this._idleTimer);
        if (!this._isRendering) {
            this._isRendering = true;
            this._animate();
        }
    }

    stopRenderLoop() {
        if (this._idleTimer) clearTimeout(this._idleTimer);
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
            this.organelleEntityMap.clear();
            this.organelleMeshMap.clear();
            this.isFallback = false;

            if (!url || url.trim() === '') {
                console.info('URL do modelo vazia, usando modelo procedural.');
                const fallbackGroup = this.createFallbackModel(organelasList, cellId, cellType);
                this.currentModel = fallbackGroup;
                this.isFallback = true;
                // Mapa já populado em createFallbackModel
                this.scene.add(this.currentModel);
                this.forceResize();
                this.renderer.render(this.scene, this.camera);
                if (!this._isRendering) this.startRenderLoop();
                if (this.clippingPlanes.length > 0) this.applyClippingPlanesToModel(this.currentModel);
                resolve({ usedFallback: true });
                return;
            }

            this.loader.load(url,
                (gltf) => {
                    this.currentModel = gltf.scene;
                    this.isFallback = false;
                    this._processGLTFModel(organelasList);
                    this.scene.add(this.currentModel);
                    this.forceResize();
                    this.renderer.render(this.scene, this.camera);
                    if (!this._isRendering) this.startRenderLoop();
                    if (this.clippingPlanes.length > 0) this.applyClippingPlanesToModel(this.currentModel);
                    resolve({ usedFallback: false });
                },
                undefined,
                (error) => {
                    console.warn(`[Fallback] Não foi possível carregar ${url}: ${error.message}. Gerando modelo substituto.`);
                    const fallbackGroup = this.createFallbackModel(organelasList, cellId, cellType);
                    this.currentModel = fallbackGroup;
                    this.isFallback = true;
                    // Mapa já populado
                    this.scene.add(this.currentModel);
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
                // Injeta userData.organelleId para que isolateOrganelle funcione
                names.forEach(name => {
                    const mesh = this.meshesMap.get(name);
                    if (mesh) mesh.userData.organelleId = org.id;
                });
            }
        });
    }

    createFallbackModel(organelasList, cellId, cellType) {
        const root = new THREE.Group();
        root.name = `fallback-${cellId}`;
        const template = CELL_TEMPLATES[cellType] || CELL_TEMPLATES.Animalia;
        if (template && template.body) {
            const { geometry, params, color, emissive, transparent, opacity } = template.body;
            let geom;
            if (geometry === 'sphere') {
                geom = new THREE.SphereGeometry(...params);
            } else if (geometry === 'cylinder') {
                geom = new THREE.CylinderGeometry(...params);
            } else {
                geom = new THREE.SphereGeometry(1.2, 32, 32);
            }
            const material = new THREE.MeshStandardMaterial({
                color,
                emissive,
                transparent,
                opacity,
                roughness: 0.6,
                side: THREE.DoubleSide
            });
            const bodyMesh = new THREE.Mesh(geom, material);
            bodyMesh.name = 'cell-body';
            bodyMesh.userData.isCellBody = true;
            root.add(bodyMesh);
        }
        const manifest = CellLayoutEngine.generateSceneManifest(organelasList, cellType, cellId);
        manifest.forEach(item => {
            const factory = ORGANELLE_ENTITY_FACTORIES[item.id] || ORGANELLE_ENTITY_FACTORIES.Default;
            let entity = factory(item);
            if (entity instanceof OrganelleEntity) {
                if (item.id === 'nucleus') {
                    entity.generateGeometry(2.5, 80);
                } else if (item.id === 'golgi') {
                    entity.generateGeometry(2.6, 72);
                } else if (item.id === 'rough_endoplasmic_reticulum') {
                    entity.generateGeometry(2.4, 80);
                } else if (item.id === 'mitochondria') {
                    entity.generateGeometry(2.2, 64);
                } else if (item.id === 'centriole') {
                    entity.generateGeometry(2.0, 64);
                } else {
                    entity.generateGeometry(2.0, 48);
                }
                const subRoot = entity.rootGroup;
                subRoot.position.set(item.position[0], item.position[1], item.position[2]);
                subRoot.rotation.set(item.rotation[0], item.rotation[1], item.rotation[2]);
                if (item.id === 'rough_endoplasmic_reticulum') {
                    subRoot.scale.set(1.05, 1.05, 1.05);
                } else if (item.id === 'golgi') {
                    subRoot.scale.set(0.65, 0.65, 0.65);
                } else if (item.id === 'nucleus') {
                    subRoot.scale.set(0.70, 0.70, 0.70);
                } else if (item.id === 'mitochondria') {
                    subRoot.scale.set(0.60, 0.60, 0.60);
                } else if (item.id === 'centriole') {
                    subRoot.scale.set(0.48, 0.48, 0.48);
                } else if (item.scale) {
                    subRoot.scale.set(item.scale[0], item.scale[1], item.scale[2]);
                } else {
                    subRoot.scale.set(0.4, 0.4, 0.4);
                }
                root.add(subRoot);
                this.organelleEntityMap.set(item.id, subRoot);
            } else if (entity && entity.isGroup) {
                const group = entity.rootGroup;
                group.position.set(item.position[0], item.position[1], item.position[2]);
                group.rotation.set(item.rotation[0], item.rotation[1], item.rotation[2]);
                if (item.id === 'golgi') {
                    group.scale.set(0.65, 0.65, 0.65);
                } else if (item.id === 'centriole') {
                    group.scale.set(0.48, 0.48, 0.48);
                } else if (item.scale) {
                    group.scale.set(item.scale[0], item.scale[1], item.scale[2]);
                } else {
                    group.scale.set(0.4, 0.4, 0.4);
                }
                root.add(group);
                this.organelleEntityMap.set(item.id, group);
            }
        });
        return root;
    }

    disposeModel(model) {
        model.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }

    clearScene() {
        while (this.scene.children.length > 0) {
            const obj = this.scene.children[0];
            this.scene.remove(obj);
            if (obj !== this.camera && obj !== this.renderer.domElement) {
                this.disposeModel(obj);
            }
        }
        this.meshesMap.clear();
        this.organelleEntityMap.clear();
        this.organelleMeshMap.clear();
        this.currentModel = null;
        this.isFallback = false;
    }

    enableCrossSection(active) {
        this.clippingPlanes = active ? [
            new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.1),
            new THREE.Plane(new THREE.Vector3(1, 0, 0), 0.0),
            new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.0)
        ] : [];
        if (this.currentModel) {
            this.applyClippingPlanesToModel(this.currentModel);
        }
    }

    applyClippingPlanesToModel(model) {
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.clippingPlanes = this.clippingPlanes.length > 0 ? this.clippingPlanes : null;
                child.material.clipShadows = true;
                child.material.needsUpdate = true;
            }
        });
    }

    isolateOrganelle(organelleId) {
        if (!this.currentModel) return;
        const bodyMeshes = [];

        // Percorre todas as malhas: guarda corpo, esconde organelas que não são o alvo
        this.currentModel.traverse((child) => {
            if (child.isMesh) {
                if (child.userData.isCellBody) {
                    bodyMeshes.push(child);
                } else if (child.userData.organelleId !== undefined) {
                    child.visible = (child.userData.organelleId === organelleId);
                }
            }
        });

        // Aplica transparência ao corpo para dar contexto
        bodyMeshes.forEach(mesh => {
            mesh.visible = true;
            if (mesh.material) {
                if (!mesh.userData.originalMaterial) {
                    mesh.userData.originalMaterial = mesh.material;
                }
                const transparentMat = mesh.material.clone();
                transparentMat.transparent = true;
                transparentMat.opacity = 0.15;
                transparentMat.emissive = new THREE.Color(0x000000);
                transparentMat.roughness = 0.8;
                mesh.material = transparentMat;
            }
        });
    }

    resetVisibility() {
        if (!this.currentModel) return;
        this.currentModel.traverse((child) => {
            if (child.isMesh) {
                child.visible = true;
                if (child.userData.originalMaterial) {
                    child.material = child.userData.originalMaterial;
                    child.userData.originalMaterial = undefined;
                }
            }
        });
    }

    enableAutoRotate(active) {
        this.controls.autoRotate = active;
        if (active) this.startRenderLoop();
    }

    resetCamera() {
        this.camera.position.set(3, 2, 5);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    downloadModel(url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = url.split('/').pop();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    dispose() {
        this.stopRenderLoop();
        if (this._idleTimer) clearTimeout(this._idleTimer);
        window.removeEventListener('resize', this._resizeHandler);
        this.controls.dispose();
        this.renderer.dispose();
        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        this.clearScene();
    }
}

// Script principal (app.js)
import { AppState, CompareState, GlobalListeners } from './state.js';
import { cacheDOM, getDOM } from './controllers/UIController.js';
import { initMainScene, loadCellData, loadCell } from './controllers/CellController.js';
import { enterCompareMode, exitCompareMode } from './controllers/CompareController.js';

document.addEventListener('DOMContentLoaded', async () => {
    cacheDOM();
    const dom = getDOM();

    try {
        initMainScene();
    } catch (e) {
        console.error('Erro crítico ao iniciar Three.js:', e);
        return;
    }

    try {
        await loadCellData();
        const defaultCell = AppState.celulasData.find(c => c.id === 'animal-cell') || AppState.celulasData[0];
        if (defaultCell) await loadCell(defaultCell);
    } catch (error) {
        console.error('Falha no carregamento dos dados:', error);
        if (dom.cellList) dom.cellList.innerHTML = '<li style="color:red;">Erro ao carregar células</li>';
        return;
    }

    if (dom.crossSectionToggle) {
        dom.crossSectionToggle.addEventListener('change', (e) => {
            AppState.isCrossSectionActive = e.target.checked;
            AppState.mainScene.enableCrossSection(AppState.isCrossSectionActive);
        });
    }

    if (dom.btnRotate) {
        dom.btnRotate.addEventListener('click', () => {
            AppState.isAutoRotateActive = !AppState.isAutoRotateActive;
            AppState.mainScene.enableAutoRotate(AppState.isAutoRotateActive);
            UIController.setRotateButtonActive(AppState.isAutoRotateActive);
        });
    }

    if (dom.btnReset) {
        dom.btnReset.addEventListener('click', () => {
            AppState.mainScene.resetCamera();
        });
    }

    if (dom.btnIsolate && dom.organelleSelect) {
        dom.btnIsolate.addEventListener('click', () => {
            const cell = AppState.currentCell;
            if (!cell) {
                UIController.updateOrganelleDesc('Selecione uma célula primeiro.');
                return;
            }
            const selectedOrgId = dom.organelleSelect.value;
            if (!selectedOrgId) {
                UIController.updateOrganelleDesc('Selecione uma organela primeiro.');
                return;
            }
            const organela = cell.organelas.find(o => o.id === selectedOrgId);
            if (organela) {
                AppState.mainScene.isolateOrganelle(organela.id);
                dom.organelleDesc.textContent = organela.descricao;
            } else {
                UIController.updateOrganelleDesc('Organela não encontrada.');
            }
        });
    }

    if (dom.organelleSelect) {
        dom.organelleSelect.addEventListener('change', () => {
            const orgId = dom.organelleSelect.value;
            const cell = AppState.currentCell;
            if (orgId && cell) {
                const organela = cell.organelas.find(o => o.id === orgId);
                if (organela) dom.organelleDesc.textContent = organela.descricao;
            } else {
                dom.organelleDesc.textContent = '';
                AppState.mainScene.resetVisibility();
            }
        });
    }

    if (dom.btnGlb) {
        dom.btnGlb.addEventListener('click', () => {
            if (dom.btnGlb.disabled) return;
            const cell = AppState.currentCell;
            if (cell && cell.arquivo_3d) {
                AppState.mainScene.downloadModel(cell.arquivo_3d);
            }
        });
    }

    if (dom.btnCompare) {
        dom.btnCompare.addEventListener('click', enterCompareMode);
    }

    if (dom.exitCompareBtn) {
        dom.exitCompareBtn.addEventListener('click', exitCompareMode);
    }

    setupMobileMenus(dom);
});

function setupMobileMenus(dom) {
    if (!dom.mobileMenuLeft || !dom.sidebarLeft) return;

    const toggleLeft = (e) => {
        e.stopPropagation();
        dom.sidebarLeft.classList.toggle('open');
        dom.sidebarRight.classList.remove('open');
    };

    dom.mobileMenuLeft.addEventListener('click', toggleLeft);
    GlobalListeners.mobileLeft = toggleLeft;

    const closeAll = () => {
        dom.sidebarLeft.classList.remove('open');
        dom.sidebarRight.classList.remove('open');
    };
    dom.canvasContainer.addEventListener('click', closeAll);
    GlobalListeners.canvasClick = closeAll;
}