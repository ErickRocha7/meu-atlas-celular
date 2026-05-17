// state.js
export const AppState = {
    celulasData: [],
    currentCell: null,
    mainScene: null,
    isCrossSectionActive: false,
    isAutoRotateActive: false,
    mode: 'single',
};

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

export const GlobalListeners = {
    mobileLeft: null,
    canvasClick: null
};