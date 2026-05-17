import { AppState, CompareState } from '../state.js';
import { ThreeSceneManager } from '../three-scene.js';
import * as UIController from './UIController.js';
import { loadCell } from './CellController.js';

async function ensureCompareScenes() {
    if (!CompareState.leftScene) {
        CompareState.leftScene = new ThreeSceneManager('canvas-left');
    } else {
        CompareState.leftScene.clearScene();
    }
    if (!CompareState.rightScene) {
        CompareState.rightScene = new ThreeSceneManager('canvas-right');
    } else {
        CompareState.rightScene.clearScene();
    }
    CompareState.leftScene.forceResize();
    CompareState.rightScene.forceResize();
}

export async function enterCompareMode() {
    const dom = UIController.getDOM();
    if (!dom.compareView) return;

    await cleanupComparisonModels();

    AppState.mode = 'compare';
    UIController.setCompareViewVisible(true);

    try {
        await ensureCompareScenes();
    } catch (e) {
        console.error('Falha ao criar/redimensionar cenas de comparação', e);
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
    CompareState._listeners.leftSelect = leftSelectHandler;
    CompareState._listeners.rightSelect = rightSelectHandler;

    setupCameraSync();
}

async function loadCompareModel(side, cell) {
    if (CompareState[`${side}AbortController`]) {
        CompareState[`${side}AbortController`].abort();
    }
    const abortController = new AbortController();
    CompareState[`${side}AbortController`] = abortController;

    CompareState.tokens[side]++;
    const token = CompareState.tokens[side];
    const scene = side === 'left' ? CompareState.leftScene : CompareState.rightScene;

    if (abortController.signal.aborted) return;

    const result = await scene.loadModel(cell.arquivo_3d, cell.organelas, cell.id, cell.categoria);
    if (token !== CompareState.tokens[side] || abortController.signal.aborted) {
        console.debug(`Load descartado para ${side} por race condition ou abort`);
        return;
    }
}

function setupCameraSync() {
    const dom = UIController.getDOM();
    const leftScene = CompareState.leftScene;
    const rightScene = CompareState.rightScene;

    const removeChangeListeners = () => {
        if (CompareState._listeners.leftChange && leftScene) {
            leftScene.controls.removeEventListener('change', CompareState._listeners.leftChange);
            CompareState._listeners.leftChange = null;
        }
        if (CompareState._listeners.rightChange && rightScene) {
            rightScene.controls.removeEventListener('change', CompareState._listeners.rightChange);
            CompareState._listeners.rightChange = null;
        }
    };
    removeChangeListeners();

    const leftChange = () => {
        if (CompareState.leftSyncActive && rightScene && leftScene) {
            rightScene.camera.position.copy(leftScene.camera.position);
            rightScene.controls.target.copy(leftScene.controls.target);
            rightScene.controls.update();
        }
    };
    const rightChange = () => {
        if (CompareState.rightSyncActive && leftScene && rightScene) {
            leftScene.camera.position.copy(rightScene.camera.position);
            leftScene.controls.target.copy(rightScene.controls.target);
            leftScene.controls.update();
        }
    };

    leftScene.controls.addEventListener('change', leftChange);
    rightScene.controls.addEventListener('change', rightChange);
    CompareState._listeners.leftChange = leftChange;
    CompareState._listeners.rightChange = rightChange;

    if (dom.btnSyncLeft) {
        if (CompareState._listeners.syncLeftClick) dom.btnSyncLeft.removeEventListener('click', CompareState._listeners.syncLeftClick);
        const handler = () => {
            CompareState.leftSyncActive = !CompareState.leftSyncActive;
            CompareState.rightSyncActive = false;
            dom.btnSyncLeft.classList.toggle('active', CompareState.leftSyncActive);
            dom.btnSyncRight.classList.remove('active');
        };
        dom.btnSyncLeft.addEventListener('click', handler);
        CompareState._listeners.syncLeftClick = handler;
    }
    if (dom.btnSyncRight) {
        if (CompareState._listeners.syncRightClick) dom.btnSyncRight.removeEventListener('click', CompareState._listeners.syncRightClick);
        const handler = () => {
            CompareState.rightSyncActive = !CompareState.rightSyncActive;
            CompareState.leftSyncActive = false;
            dom.btnSyncRight.classList.toggle('active', CompareState.rightSyncActive);
            dom.btnSyncLeft.classList.remove('active');
        };
        dom.btnSyncRight.addEventListener('click', handler);
        CompareState._listeners.syncRightClick = handler;
    }
}

async function cleanupComparisonModels() {
    const dom = UIController.getDOM();

    if (dom.compareLeftSelect && CompareState._listeners.leftSelect) {
        dom.compareLeftSelect.removeEventListener('change', CompareState._listeners.leftSelect);
        CompareState._listeners.leftSelect = null;
    }
    if (dom.compareRightSelect && CompareState._listeners.rightSelect) {
        dom.compareRightSelect.removeEventListener('change', CompareState._listeners.rightSelect);
        CompareState._listeners.rightSelect = null;
    }

    const removeChange = (scene, listenerKey) => {
        if (scene && CompareState._listeners[listenerKey]) {
            scene.controls.removeEventListener('change', CompareState._listeners[listenerKey]);
            CompareState._listeners[listenerKey] = null;
        }
    };
    removeChange(CompareState.leftScene, 'leftChange');
    removeChange(CompareState.rightScene, 'rightChange');

    if (dom.btnSyncLeft && CompareState._listeners.syncLeftClick) {
        dom.btnSyncLeft.removeEventListener('click', CompareState._listeners.syncLeftClick);
        CompareState._listeners.syncLeftClick = null;
    }
    if (dom.btnSyncRight && CompareState._listeners.syncRightClick) {
        dom.btnSyncRight.removeEventListener('click', CompareState._listeners.syncRightClick);
        CompareState._listeners.syncRightClick = null;
    }

    // Libera recursos das cenas de comparação
    if (CompareState.leftScene) {
        CompareState.leftScene.dispose();
        CompareState.leftScene = null;
    }
    if (CompareState.rightScene) {
        CompareState.rightScene.dispose();
        CompareState.rightScene = null;
    }

    CompareState.leftSyncActive = false;
    CompareState.rightSyncActive = false;
    if (dom.btnSyncLeft) dom.btnSyncLeft.classList.remove('active');
    if (dom.btnSyncRight) dom.btnSyncRight.classList.remove('active');
}

export async function exitCompareMode() {
    await cleanupComparisonModels();
    UIController.setCompareViewVisible(false);
    AppState.mode = 'single';

    if (AppState.currentCell) {
        await loadCell(AppState.currentCell);
    }
}