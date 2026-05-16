import { ThreeSceneManager } from './three-scene.js';

// --------------------------------------------------------------
// 1. Cache centralizado de elementos DOM
// --------------------------------------------------------------
const dom = {
    // Sidebar esquerda
    cellList: null,
    // Cabeçalho central
    currentCellName: null,
    currentCellType: null,
    canvasContainer: null,
    // Sidebar direita
    organelleSelect: null,
    organelleDesc: null,
    microLight: null,
    microStained: null,
    microElectron: null,
    crossSectionToggle: null,
    btnRotate: null,
    btnIsolate: null,
    btnReset: null,
    btnGlb: null,
    btnCompare: null,
    // Modo comparação
    compareView: null,
    compareLeftSelect: null,
    compareRightSelect: null,
    exitCompareBtn: null,
    btnSyncLeft: null,
    btnSyncRight: null,
    // Mobile
    mobileMenuLeft: null,
    sidebarLeft: null,
    sidebarRight: null
};

// Estado global
let celulasData = [];
let currentCell = null;
let threeScene = null;
let isCrossSectionActive = false;
let isAutoRotateActive = false;

// Controle de load token (race condition)
let currentLoadToken = 0;

// Instâncias do Modo de Comparação
let leftScene = null;
let rightScene = null;
let leftSyncActive = false;
let rightSyncActive = false;

// Handlers guardados para remoção limpa
let leftChangeHandler = null;
let rightChangeHandler = null;
let leftSelectHandler = null;
let rightSelectHandler = null;
let mobileLeftListener = null;
let canvasClickListener = null;

// --------------------------------------------------------------
// 2. Função auxiliar para fallback de imagens
// --------------------------------------------------------------
function setImageWithFallback(imgElement, src, alt = 'Microscopy image') {
    if (!imgElement) return;
    imgElement.alt = alt;
    // Se não houver src ou src vazio, já aplica placeholder
    if (!src) {
        applyPlaceholder(imgElement);
        return;
    }
    imgElement.src = src;
    imgElement.onerror = () => applyPlaceholder(imgElement);
}

function applyPlaceholder(imgElement) {
    // Cria um placeholder SVG elegante com gradiente e ícone
    const placeholderSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23cbd5e1'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='%235a6e7c' font-size='12' font-family='monospace'%3E🔬 No Asset%3C/text%3E%3C/svg%3E`;
    imgElement.src = placeholderSvg;
    imgElement.style.objectFit = 'contain';
    imgElement.style.background = 'none'; // evita duplicação visual
}

// --------------------------------------------------------------
// 3. Inicialização principal
// --------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    // Preenche cache DOM
    dom.cellList = document.getElementById('cell-list');
    dom.currentCellName = document.getElementById('current-cell-name');
    dom.currentCellType = document.getElementById('current-cell-type');
    dom.canvasContainer = document.getElementById('canvas-container');
    dom.organelleSelect = document.getElementById('organelle-select');
    dom.organelleDesc = document.getElementById('organelle-desc');
    dom.microLight = document.getElementById('micro-light');
    dom.microStained = document.getElementById('micro-stained');
    dom.microElectron = document.getElementById('micro-electron');
    dom.crossSectionToggle = document.getElementById('cross-section');
    dom.btnRotate = document.getElementById('btn-rotate');
    dom.btnIsolate = document.getElementById('btn-isolate');
    dom.btnReset = document.getElementById('btn-reset');
    dom.btnGlb = document.getElementById('btn-glb');
    dom.btnCompare = document.getElementById('btn-compare');
    dom.compareView = document.getElementById('compare-view');
    dom.compareLeftSelect = document.getElementById('compare-left-select');
    dom.compareRightSelect = document.getElementById('compare-right-select');
    dom.exitCompareBtn = document.getElementById('exit-compare');
    dom.mobileMenuLeft = document.getElementById('mobile-menu-left');
    dom.sidebarLeft = document.querySelector('.sidebar-left');
    dom.sidebarRight = document.querySelector('.sidebar-right');
    dom.btnSyncLeft = document.querySelector('[data-side="left"]');
    dom.btnSyncRight = document.querySelector('[data-side="right"]');

    // Inicializa motor 3D principal
    if (!dom.canvasContainer) {
        console.error('Container 3D não encontrado');
        return;
    }
    try {
        threeScene = new ThreeSceneManager('canvas-container');
    } catch (e) {
        console.error('Erro crítico ao iniciar Three.js:', e);
        return;
    }

    // Carrega JSON
    try {
        const response = await fetch('celulas.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        celulasData = data.celulas;
        populateCellList();

        const defaultCell = celulasData.find(c => c.id === 'animal-cell') || celulasData[0];
        if (defaultCell) await loadCell(defaultCell);

        attachEventListeners();
        setupMobileMenus();
    } catch (error) {
        console.error('Falha no carregamento dos dados:', error);
        if (dom.cellList) dom.cellList.innerHTML = '<li style="color:red;">Erro ao carregar células</li>';
    }
});

// --------------------------------------------------------------
// 4. Funções auxiliares (população, loadCell)
// --------------------------------------------------------------
function populateCellList() {
    if (!dom.cellList) return;
    dom.cellList.innerHTML = '';
    celulasData.forEach(cell => {
        const li = document.createElement('li');
        li.className = 'cell-item';
        li.dataset.id = cell.id;
        li.innerHTML = `
            <span class="cell-icon">${cell.categoria === 'Animalia' ? '🧬' : '🌿'}</span>
            <div>
                <span class="cell-name">${cell.nome}</span>
                <span class="cell-type">${cell.tipo}</span>
            </div>
        `;
        li.addEventListener('click', () => {
            document.querySelectorAll('.cell-item').forEach(item => item.classList.remove('active'));
            li.classList.add('active');
            loadCell(cell);
        });
        dom.cellList.appendChild(li);
    });
}

async function loadCell(cell) {
    // Incrementa token para cancelar promises anteriores (race condition)
    const thisLoadToken = ++currentLoadToken;
    currentCell = cell;

    if (dom.currentCellName) dom.currentCellName.innerText = cell.nome;
    if (dom.currentCellType) dom.currentCellType.innerText = cell.tipo;

    // Atualiza imagens de microscopia com fallback elegante
    if (cell.imagens_microscopio) {
        setImageWithFallback(dom.microLight, cell.imagens_microscopio.light, 'Light microscopy');
        setImageWithFallback(dom.microStained, cell.imagens_microscopio.stained, 'Stained sample');
        setImageWithFallback(dom.microElectron, cell.imagens_microscopio.electron, 'Electron microscopy');
    } else {
        // Se não houver imagens no JSON, aplica placeholder diretamente
        setImageWithFallback(dom.microLight, null, 'Light microscopy');
        setImageWithFallback(dom.microStained, null, 'Stained sample');
        setImageWithFallback(dom.microElectron, null, 'Electron microscopy');
    }

    // Popula dropdown de organelas
    if (dom.organelleSelect) {
        dom.organelleSelect.innerHTML = '<option value="">Selecione uma organela...</option>';
        if (cell.organelas && cell.organelas.length) {
            cell.organelas.forEach(org => {
                const option = document.createElement('option');
                option.value = org.id;
                option.textContent = org.nome;
                dom.organelleSelect.appendChild(option);
            });
        }
    }
    if (dom.organelleDesc) dom.organelleDesc.innerText = '';

    // Carrega modelo 3D com verificação de token
    try {
        // Passando cell.categoria como quarto parâmetro (cellType)
        await threeScene.loadModel(cell.arquivo_3d, cell.organelas, cell.id, cell.categoria);
        if (thisLoadToken !== currentLoadToken) {
            // Um load mais recente já começou, descarta este
            console.debug('Load model descartado por race condition');
            return;
        }
        threeScene.enableCrossSection(isCrossSectionActive);
        threeScene.resetVisibility();
    } catch (err) {
        console.error('Erro no carregamento do modelo 3D:', err);
    }
}

// --------------------------------------------------------------
// 5. Anexar event listeners principais (com checagem nula)
// --------------------------------------------------------------
function attachEventListeners() {
    if (dom.crossSectionToggle) {
        dom.crossSectionToggle.addEventListener('change', (e) => {
            isCrossSectionActive = e.target.checked;
            if (threeScene) threeScene.enableCrossSection(isCrossSectionActive);
        });
    }

    if (dom.btnRotate) {
        dom.btnRotate.addEventListener('click', () => {
            isAutoRotateActive = !isAutoRotateActive;
            if (threeScene) threeScene.enableAutoRotate(isAutoRotateActive);
            dom.btnRotate.style.background = isAutoRotateActive ? '#eef2ff' : 'white';
        });
    }

    if (dom.btnReset) {
        dom.btnReset.addEventListener('click', () => {
            if (threeScene) threeScene.resetCamera();
        });
    }

    if (dom.btnIsolate && dom.organelleSelect) {
        dom.btnIsolate.addEventListener('click', () => {
            if (!currentCell) return;
            const selectedOrgId = dom.organelleSelect.value;
            if (!selectedOrgId) {
                alert('Selecione uma organela primeiro.');
                return;
            }
            const organela = currentCell.organelas.find(o => o.id === selectedOrgId);
            if (organela && organela.mesh_name) {
                if (threeScene) threeScene.isolateOrganelle(organela.mesh_name);
                if (dom.organelleDesc) dom.organelleDesc.innerText = organela.descricao;
            } else {
                alert('Nome da organela não encontrado no modelo 3D.');
            }
        });
    }

    if (dom.organelleSelect) {
        dom.organelleSelect.addEventListener('change', () => {
            const orgId = dom.organelleSelect.value;
            if (orgId && currentCell) {
                const organela = currentCell.organelas.find(o => o.id === orgId);
                if (organela && dom.organelleDesc) dom.organelleDesc.innerText = organela.descricao;
            } else {
                if (dom.organelleDesc) dom.organelleDesc.innerText = '';
                if (threeScene) threeScene.resetVisibility();
            }
        });
    }

    if (dom.btnGlb && currentCell) {
        dom.btnGlb.addEventListener('click', () => {
            if (currentCell && currentCell.arquivo_3d && threeScene) {
                threeScene.downloadModel(currentCell.arquivo_3d);
            }
        });
    }

    if (dom.btnCompare) {
        dom.btnCompare.addEventListener('click', enterCompareMode);
    }

    if (dom.exitCompareBtn) {
        dom.exitCompareBtn.addEventListener('click', exitCompareMode);
    }
}

// --------------------------------------------------------------
// 6. Modo comparação (com limpeza completa)
// --------------------------------------------------------------
async function enterCompareMode() {
    if (!dom.compareView || !dom.canvasContainer) return;
    dom.canvasContainer.style.display = 'none';
    dom.compareView.style.display = 'block';

    // Limpa qualquer modo comparação anterior
    exitCompareMode(true); // true = apenas limpeza, sem restaurar layout

    try {
        leftScene = new ThreeSceneManager('canvas-left');
        rightScene = new ThreeSceneManager('canvas-right');
    } catch (e) {
        console.error('Falha ao criar cenas de comparação', e);
        return;
    }

    if (!dom.compareLeftSelect || !dom.compareRightSelect) return;
    dom.compareLeftSelect.innerHTML = '';
    dom.compareRightSelect.innerHTML = '';

    celulasData.forEach(cell => {
        const optLeft = document.createElement('option');
        optLeft.value = cell.id;
        optLeft.textContent = `${cell.nome} (${cell.tipo})`;
        const optRight = document.createElement('option');
        optRight.value = cell.id;
        optRight.textContent = `${cell.nome} (${cell.tipo})`;
        dom.compareLeftSelect.appendChild(optLeft);
        dom.compareRightSelect.appendChild(optRight);
    });

    const currentId = currentCell ? currentCell.id : celulasData[0].id;
    dom.compareLeftSelect.value = currentId;
    let rightDefaultId = celulasData.find(c => c.id !== currentId)?.id || celulasData[0].id;
    dom.compareRightSelect.value = rightDefaultId;

    const leftCell = celulasData.find(c => c.id === currentId);
    const rightCell = celulasData.find(c => c.id === rightDefaultId);

    await Promise.all([
        leftScene.loadModel(leftCell.arquivo_3d, leftCell.organelas, leftCell.id, leftCell.categoria),
        rightScene.loadModel(rightCell.arquivo_3d, rightCell.organelas, rightCell.id, rightCell.categoria)
    ]);

    // Handlers dos selects (já com limpeza)
    if (leftSelectHandler) dom.compareLeftSelect.removeEventListener('change', leftSelectHandler);
    if (rightSelectHandler) dom.compareRightSelect.removeEventListener('change', rightSelectHandler);

    leftSelectHandler = async (e) => {
        const cell = celulasData.find(c => c.id === e.target.value);
        if (cell && leftScene) await leftScene.loadModel(cell.arquivo_3d, cell.organelas, cell.id, cell.categoria);
    };
    rightSelectHandler = async (e) => {
        const cell = celulasData.find(c => c.id === e.target.value);
        if (cell && rightScene) await rightScene.loadModel(cell.arquivo_3d, cell.organelas, cell.id, cell.categoria);
    };

    dom.compareLeftSelect.addEventListener('change', leftSelectHandler);
    dom.compareRightSelect.addEventListener('change', rightSelectHandler);

    setupCameraSync();
}

function setupCameraSync() {
    // Remove listeners anteriores
    if (leftChangeHandler && leftScene) leftScene.controls.removeEventListener('change', leftChangeHandler);
    if (rightChangeHandler && rightScene) rightScene.controls.removeEventListener('change', rightChangeHandler);

    leftChangeHandler = () => {
        if (leftSyncActive && rightScene && leftScene) {
            rightScene.camera.position.copy(leftScene.camera.position);
            rightScene.controls.target.copy(leftScene.controls.target);
            rightScene.controls.update();
        }
    };
    rightChangeHandler = () => {
        if (rightSyncActive && leftScene && rightScene) {
            leftScene.camera.position.copy(rightScene.camera.position);
            leftScene.controls.target.copy(rightScene.controls.target);
            leftScene.controls.update();
        }
    };

    leftScene.controls.addEventListener('change', leftChangeHandler);
    rightScene.controls.addEventListener('change', rightChangeHandler);

    if (dom.btnSyncLeft) {
        // Remove listeners antigos para evitar duplicação
        dom.btnSyncLeft.replaceWith(dom.btnSyncLeft.cloneNode(true));
        dom.btnSyncLeft = document.querySelector('[data-side="left"]');
        dom.btnSyncLeft.addEventListener('click', () => {
            leftSyncActive = !leftSyncActive;
            rightSyncActive = false;
            dom.btnSyncLeft.classList.toggle('active', leftSyncActive);
            if (dom.btnSyncRight) dom.btnSyncRight.classList.remove('active');
        });
    }

    if (dom.btnSyncRight) {
        dom.btnSyncRight.replaceWith(dom.btnSyncRight.cloneNode(true));
        dom.btnSyncRight = document.querySelector('[data-side="right"]');
        dom.btnSyncRight.addEventListener('click', () => {
            rightSyncActive = !rightSyncActive;
            leftSyncActive = false;
            dom.btnSyncRight.classList.toggle('active', rightSyncActive);
            if (dom.btnSyncLeft) dom.btnSyncLeft.classList.remove('active');
        });
    }
}

function exitCompareMode(skipLayoutRestore = false) {
    // Remove handlers dos selects
    if (dom.compareLeftSelect && leftSelectHandler) {
        dom.compareLeftSelect.removeEventListener('change', leftSelectHandler);
        leftSelectHandler = null;
    }
    if (dom.compareRightSelect && rightSelectHandler) {
        dom.compareRightSelect.removeEventListener('change', rightSelectHandler);
        rightSelectHandler = null;
    }

    // Destrói cenas e listeners de câmera
    if (leftScene) {
        if (leftChangeHandler) leftScene.controls.removeEventListener('change', leftChangeHandler);
        leftScene.dispose();
        leftScene = null;
    }
    if (rightScene) {
        if (rightChangeHandler) rightScene.controls.removeEventListener('change', rightChangeHandler);
        rightScene.dispose();
        rightScene = null;
    }

    leftSyncActive = false;
    rightSyncActive = false;
    leftChangeHandler = null;
    rightChangeHandler = null;

    // Reseta aparência dos botões de sync
    if (dom.btnSyncLeft) dom.btnSyncLeft.classList.remove('active');
    if (dom.btnSyncRight) dom.btnSyncRight.classList.remove('active');

    if (!skipLayoutRestore && dom.compareView && dom.canvasContainer) {
        dom.compareView.style.display = 'none';
        dom.canvasContainer.style.display = 'flex'; // ou o estilo original
        // Recarrega modelo atual na cena principal
        if (currentCell && threeScene) {
            threeScene.loadModel(currentCell.arquivo_3d, currentCell.organelas, currentCell.id, currentCell.categoria);
            if (isCrossSectionActive) threeScene.enableCrossSection(true);
            threeScene.resetVisibility();
        }
    }
}

// --------------------------------------------------------------
// 7. Menus mobile com remoção/adição defensiva de listeners
// --------------------------------------------------------------
function setupMobileMenus() {
    if (!dom.mobileMenuLeft || !dom.sidebarLeft) return;

    // Remove listener antigo se existir
    if (mobileLeftListener) {
        dom.mobileMenuLeft.removeEventListener('click', mobileLeftListener);
    }
    mobileLeftListener = (e) => {
        e.stopPropagation();
        dom.sidebarLeft.classList.toggle('open');
        if (dom.sidebarRight) dom.sidebarRight.classList.remove('open');
    };
    dom.mobileMenuLeft.addEventListener('click', mobileLeftListener);

    if (dom.canvasContainer) {
        if (canvasClickListener) {
            dom.canvasContainer.removeEventListener('click', canvasClickListener);
        }
        canvasClickListener = () => {
            if (dom.sidebarLeft) dom.sidebarLeft.classList.remove('open');
            if (dom.sidebarRight) dom.sidebarRight.classList.remove('open');
        };
        dom.canvasContainer.addEventListener('click', canvasClickListener);
    }
}