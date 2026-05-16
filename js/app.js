import { AppState } from './state.js';
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
            if (!cell) return;
            const selectedOrgId = dom.organelleSelect.value;
            if (!selectedOrgId) {
                alert('Selecione uma organela primeiro.');
                return;
            }
            const organela = cell.organelas.find(o => o.id === selectedOrgId);
            if (organela) {
                AppState.mainScene.isolateOrganelle(organela.id);
                dom.organelleDesc.innerText = organela.descricao;
            } else {
                alert('Organela não encontrada nos dados.');
            }
        });
    }

    if (dom.organelleSelect) {
        dom.organelleSelect.addEventListener('change', () => {
            const orgId = dom.organelleSelect.value;
            const cell = AppState.currentCell;
            if (orgId && cell) {
                const organela = cell.organelas.find(o => o.id === orgId);
                if (organela) dom.organelleDesc.innerText = organela.descricao;
            } else {
                dom.organelleDesc.innerText = '';
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
    AppState._listeners.mobileLeft = toggleLeft;

    const closeAll = () => {
        dom.sidebarLeft.classList.remove('open');
        dom.sidebarRight.classList.remove('open');
    };
    dom.canvasContainer.addEventListener('click', closeAll);
    AppState._listeners.canvasClick = closeAll;
}