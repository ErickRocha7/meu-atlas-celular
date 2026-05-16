// Centraliza o estado principal da aplicação (modo single)
export const AppState = {
    celulasData: [],
    currentCell: null,
    mainScene: null,
    isCrossSectionActive: false,
    isAutoRotateActive: false,
    mode: 'single', // 'single' | 'compare'
};

// Estado exclusivo do modo de comparação
export const CompareState = {
    leftScene: null,
    rightScene: null,
    leftSyncActive: false,
    rightSyncActive: false,
    tokens: { left: 0, right: 0 },
    leftAbortController: null,
    rightAbortController: null,
    _listeners: {
        leftChange: null,
        rightChange: null,
        leftSelect: null,
        rightSelect: null,
        syncLeftClick: null,
        syncRightClick: null
    }
};

// Listeners globais mantidos para limpeza (mobile menu, etc.)
export const GlobalListeners = {
    mobileLeft: null,
    canvasClick: null
};