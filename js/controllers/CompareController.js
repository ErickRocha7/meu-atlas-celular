import { AppState } from '../state.js';
import { ThreeSceneManager } from '../three-scene.js';
import * as UIController from './UIController.js';
import { loadCell } from './CellController.js';

const tokens = { left: 0, right: 0 };  // 👈 Objeto simples em vez de eval

export async function enterCompareMode() {
    const dom = UIController.getDOM();
    if (!dom.compareView) return;

    await cleanupComparison();

    AppState.mode = 'compare';
    UIController.setCompareViewVisible(true);

    try {
        AppState.leftScene = new ThreeSceneManager('canvas-left');
        AppState.rightScene = new ThreeSceneManager('canvas-right');
        // Garantir que as cenas tenham o tamanho correto após exibição
        AppState.leftScene.forceResize();
        AppState.rightScene.forceResize();
    } catch (e) {
        console.error('Falha ao criar cenas de comparação', e);
        return;
    }

    UIController.populateCompareSelects(AppState.celulasData);

    const currentId = AppState.currentCell ? AppState.currentCell.id : AppState.celulasData[0].id;
    dom.compareLeftSelect.value = currentId;
    const rightDefaultId = AppState.celulasData.find(c => c.id !== currentId)?.id || AppState.celulasData[0].id;
    dom.compareRightSelect.value = rightDefaultId;

    const leftCell = AppState.celulasData.find(c => c.id === currentId);
    const rightCell = AppState.celulasData.find(c => c.id === rightDefaultId);

    UIController.showLoading();
    await Promise.all([
        loadCompareModel('left', leftCell),
        loadCompareModel('right', rightCell)
    ]);
    UIController.hideLoading();

    const leftSelectHandler = async (e) => {
        const cell = AppState.celulasData.find(c => c.id === e.target.value);
        if (cell) {
            UIController.showLoading();
            await loadCompareModel('left', cell);
            UIController.hideLoading();
        }
    };
    const rightSelectHandler = async (e) => {
        const cell = AppState.celulasData.find(c => c.id === e.target.value);
        if (cell) {
            UIController.showLoading();
            await loadCompareModel('right', cell);
            UIController.hideLoading();
        }
    };

    dom.compareLeftSelect.addEventListener('change', leftSelectHandler);
    dom.compareRightSelect.addEventListener('change', rightSelectHandler);
    AppState._listeners.leftSelect = leftSelectHandler;
    AppState._listeners.rightSelect = rightSelectHandler;

    setupCameraSync();
}

async function loadCompareModel(side, cell) {
    tokens[side]++;   // 👈 Incremento direto
    const token = tokens[side];
    const scene = side === 'left' ? AppState.leftScene : AppState.rightScene;

    const result = await scene.loadModel(cell.arquivo_3d, cell.organelas, cell.id, cell.categoria);
    if (token !== tokens[side]) {
        console.debug(`Load descartado para ${side} por race condition`);
        return;
    }
}

function setupCameraSync() {
    const dom = UIController.getDOM();
    const leftScene = AppState.leftScene;
    const rightScene = AppState.rightScene;

    const removeChangeListeners = () => {
        if (AppState._listeners.leftChange && leftScene) {
            leftScene.controls.removeEventListener('change', AppState._listeners.leftChange);
            AppState._listeners.leftChange = null;
        }
        if (AppState._listeners.rightChange && rightScene) {
            rightScene.controls.removeEventListener('change', AppState._listeners.rightChange);
            AppState._listeners.rightChange = null;
        }
    };
    removeChangeListeners();

    const leftChange = () => {
        if (AppState.leftSyncActive && rightScene && leftScene) {
            rightScene.camera.position.copy(leftScene.camera.position);
            rightScene.controls.target.copy(leftScene.controls.target);
            rightScene.controls.update();
        }
    };
    const rightChange = () => {
        if (AppState.rightSyncActive && leftScene && rightScene) {
            leftScene.camera.position.copy(rightScene.camera.position);
            leftScene.controls.target.copy(rightScene.controls.target);
            leftScene.controls.update();
        }
    };

    leftScene.controls.addEventListener('change', leftChange);
    rightScene.controls.addEventListener('change', rightChange);
    AppState._listeners.leftChange = leftChange;
    AppState._listeners.rightChange = rightChange;

    if (dom.btnSyncLeft) {
        if (AppState._listeners.syncLeftClick) dom.btnSyncLeft.removeEventListener('click', AppState._listeners.syncLeftClick);
        const handler = () => {
            AppState.leftSyncActive = !AppState.leftSyncActive;
            AppState.rightSyncActive = false;
            dom.btnSyncLeft.classList.toggle('active', AppState.leftSyncActive);
            dom.btnSyncRight.classList.remove('active');
        };
        dom.btnSyncLeft.addEventListener('click', handler);
        AppState._listeners.syncLeftClick = handler;
    }
    if (dom.btnSyncRight) {
        if (AppState._listeners.syncRightClick) dom.btnSyncRight.removeEventListener('click', AppState._listeners.syncRightClick);
        const handler = () => {
            AppState.rightSyncActive = !AppState.rightSyncActive;
            AppState.leftSyncActive = false;
            dom.btnSyncRight.classList.toggle('active', AppState.rightSyncActive);
            dom.btnSyncLeft.classList.remove('active');
        };
        dom.btnSyncRight.addEventListener('click', handler);
        AppState._listeners.syncRightClick = handler;
    }
}

export async function cleanupComparison() {
    const dom = UIController.getDOM();

    if (dom.compareLeftSelect && AppState._listeners.leftSelect) {
        dom.compareLeftSelect.removeEventListener('change', AppState._listeners.leftSelect);
        AppState._listeners.leftSelect = null;
    }
    if (dom.compareRightSelect && AppState._listeners.rightSelect) {
        dom.compareRightSelect.removeEventListener('change', AppState._listeners.rightSelect);
        AppState._listeners.rightSelect = null;
    }

    const removeChange = (scene, listenerKey) => {
        if (scene && AppState._listeners[listenerKey]) {
            scene.controls.removeEventListener('change', AppState._listeners[listenerKey]);
            AppState._listeners[listenerKey] = null;
        }
    };
    removeChange(AppState.leftScene, 'leftChange');
    removeChange(AppState.rightScene, 'rightChange');

    if (dom.btnSyncLeft && AppState._listeners.syncLeftClick) {
        dom.btnSyncLeft.removeEventListener('click', AppState._listeners.syncLeftClick);
        AppState._listeners.syncLeftClick = null;
    }
    if (dom.btnSyncRight && AppState._listeners.syncRightClick) {
        dom.btnSyncRight.removeEventListener('click', AppState._listeners.syncRightClick);
        AppState._listeners.syncRightClick = null;
    }

    if (AppState.leftScene) {
        AppState.leftScene.dispose();
        AppState.leftScene = null;
    }
    if (AppState.rightScene) {
        AppState.rightScene.dispose();
        AppState.rightScene = null;
    }

    AppState.leftSyncActive = false;
    AppState.rightSyncActive = false;
    if (dom.btnSyncLeft) dom.btnSyncLeft.classList.remove('active');
    if (dom.btnSyncRight) dom.btnSyncRight.classList.remove('active');
}

export async function exitCompareMode() {
    await cleanupComparison();
    UIController.setCompareViewVisible(false);
    AppState.mode = 'single';

    if (AppState.currentCell) {
        await loadCell(AppState.currentCell);
    }
}