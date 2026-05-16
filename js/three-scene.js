import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Otimização de performance para telas Retina
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
    
    loadModel(url, organelasList = []) {
        return new Promise((resolve, reject) => {
            if (this.currentModel) {
                this.scene.remove(this.currentModel);
                this.disposeModel(this.currentModel);
            }
            
            this.loader.load(url, (gltf) => {
                this.currentModel = gltf.scene;
                this.meshesMap.clear();
                
                this.currentModel.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = false;
                        if (child.material) {
                            child.material.side = THREE.DoubleSide; // Garante renderização interna no corte transversal
                        }
                        if (child.name) {
                            this.meshesMap.set(child.name, child);
                        }
                    }
                });
                
                this.scene.add(this.currentModel);
                
                if (this.clippingPlanes.length > 0) {
                    this.applyClippingPlanesToModel(this.currentModel);
                }
                
                resolve(gltf);
            }, undefined, (error) => {
                console.error('Erro ao carregar modelo:', error);
                reject(error);
            });
        });
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
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
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
