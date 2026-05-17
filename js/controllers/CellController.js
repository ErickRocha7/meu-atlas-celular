// controllers/CellController.js
import { AppState } from '../state.js';
import { ThreeSceneManager } from '../three-scene.js';
import * as UIController from './UIController.js';

let currentLoadToken = 0;
let currentAbortController = null;

export function initMainScene() {
    const container = document.getElementById('canvas-container');
    if (!container) throw new Error('Container 3D não encontrado');
    AppState.mainScene = new ThreeSceneManager('canvas-container');
}

export async function loadCellData() {
    const response = await fetch('celulas.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    AppState.celulasData = data.celulas;
    populateCellList();
}

function populateCellList() {
    const dom = UIController.getDOM();
    if (!dom.cellList) return;
    dom.cellList.innerHTML = '';
    AppState.celulasData.forEach(cell => {
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

export async function loadCell(cell) {
    if (currentAbortController) {
        currentAbortController.abort();
    }
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;

    const token = ++currentLoadToken;
    AppState.currentCell = cell;

    UIController.updateCellHeader(cell);
    UIController.updateMicroscopyImages(cell.imagens_microscopio);
    UIController.populateOrganelleDropdown(cell.organelas);
    UIController.updateOrganelleDesc('');

    const scene = AppState.mainScene;
    UIController.showLoading();

    try {
        if (signal.aborted) {
            UIController.hideLoading();
            return;
        }

        const result = await scene.loadModel(cell.arquivo_3d, cell.organelas, cell.id, cell.categoria);
        if (token !== currentLoadToken || signal.aborted) {
            console.debug('Load descartado por race condition ou abort');
            UIController.hideLoading();
            return;
        }

        UIController.setFallbackIndicator(result.usedFallback);
        UIController.setDownloadButtonState(
            result.usedFallback,
            result.usedFallback ? 'Download indisponível – modelo alternativo em uso' : ''
        );

        scene.enableCrossSection(AppState.isCrossSectionActive);
        scene.resetVisibility();

        const dom = UIController.getDOM();
        if (dom.organelleSelect) dom.organelleSelect.value = '';
        UIController.updateOrganelleDesc('');
        if (AppState.isAutoRotateActive) scene.enableAutoRotate(true);
    } catch (err) {
        if (err.name === 'AbortError') {
            console.debug('Carregamento abortado');
        } else {
            console.error('Erro ao carregar modelo:', err);
        }
    } finally {
        UIController.hideLoading();
        currentAbortController = null;
    }
}