// controllers/UIController.js
const dom = {};

function cacheDOM() {
    dom.cellList = document.getElementById('cell-list');
    dom.currentCellName = document.getElementById('current-cell-name');
    dom.currentCellType = document.getElementById('current-cell-type');
    dom.canvasContainer = document.getElementById('canvas-container');
    dom.fallbackIndicator = document.getElementById('fallback-indicator');
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
    dom.loadingOverlay = document.getElementById('loading-overlay');
}

export function updateCellHeader(cell) {
    if (dom.currentCellName) dom.currentCellName.textContent = cell.nome;
    if (dom.currentCellType) dom.currentCellType.textContent = cell.tipo;
}

export function updateMicroscopyImages(imagens) {
    if (imagens) {
        setImageWithFallback(dom.microLight, imagens.light, 'Light microscopy');
        setImageWithFallback(dom.microStained, imagens.stained, 'Stained sample');
        setImageWithFallback(dom.microElectron, imagens.electron, 'Electron microscopy');
    } else {
        setImageWithFallback(dom.microLight, null, 'Light microscopy');
        setImageWithFallback(dom.microStained, null, 'Stained sample');
        setImageWithFallback(dom.microElectron, null, 'Electron microscopy');
    }
}

export function populateOrganelleDropdown(organelas) {
    if (!dom.organelleSelect) return;
    dom.organelleSelect.innerHTML = '<option value="">Selecione uma organela...</option>';
    organelas.forEach(org => {
        const option = document.createElement('option');
        option.value = org.id;
        option.textContent = org.nome;
        dom.organelleSelect.appendChild(option);
    });
}

export function updateOrganelleDesc(text = '') {
    if (dom.organelleDesc) dom.organelleDesc.textContent = text;
}

export function setFallbackIndicator(show) {
    if (dom.fallbackIndicator) {
        dom.fallbackIndicator.style.display = show ? 'block' : 'none';
    }
}

export function setDownloadButtonState(disabled, title = '') {
    if (dom.btnGlb) {
        dom.btnGlb.disabled = disabled;
        dom.btnGlb.title = title;
    }
}

export function setRotateButtonActive(active) {
    if (dom.btnRotate) {
        dom.btnRotate.style.background = active ? '#eef2ff' : 'white';
    }
}

export function setCompareViewVisible(visible) {
    if (dom.compareView) dom.compareView.style.display = visible ? 'block' : 'none';
    if (dom.canvasContainer) dom.canvasContainer.style.display = visible ? 'none' : '';
}

export function populateCompareSelects(celulas) {
    if (!dom.compareLeftSelect || !dom.compareRightSelect) return;
    dom.compareLeftSelect.innerHTML = '';
    dom.compareRightSelect.innerHTML = '';
    celulas.forEach(cell => {
        const optLeft = document.createElement('option');
        optLeft.value = cell.id;
        optLeft.textContent = `${cell.nome} (${cell.tipo})`;
        dom.compareLeftSelect.appendChild(optLeft);
        const optRight = document.createElement('option');
        optRight.value = cell.id;
        optRight.textContent = `${cell.nome} (${cell.tipo})`;
        dom.compareRightSelect.appendChild(optRight);
    });
}

export function showLoading() {
    if (dom.loadingOverlay) dom.loadingOverlay.style.display = 'flex';
}

export function hideLoading() {
    if (dom.loadingOverlay) dom.loadingOverlay.style.display = 'none';
}

function setImageWithFallback(imgElement, src, alt = 'Microscopy image') {
    if (!imgElement) return;
    imgElement.alt = alt;
    if (!src) {
        applyPlaceholder(imgElement);
        return;
    }
    // Codifica apenas se a URL ainda não estiver codificada (evita dupla codificação)
    const sanitizedSrc = /%[0-9A-Fa-f]{2}/.test(src) ? src : encodeURI(src).replace(/#/g, '%23');
    imgElement.src = sanitizedSrc;
    imgElement.onerror = () => applyPlaceholder(imgElement);
}

function applyPlaceholder(imgElement) {
    const placeholderSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23cbd5e1'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='%235a6e7c' font-size='12' font-family='monospace'%3E🔬 No Asset%3C/text%3E%3C/svg%3E`;
    imgElement.src = placeholderSvg;
    imgElement.style.objectFit = 'contain';
    imgElement.style.background = 'none';
}

export function getDOM() {
    return dom;
}

export { cacheDOM };