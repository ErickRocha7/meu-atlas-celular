// Centraliza o estado da aplicação, permitindo acesso único e consistente.
export const AppState = {
    // Dados
    celulasData: [],
    currentCell: null,

    // Cena principal
    mainScene: null,

    // Flags de UI
    isCrossSectionActive: false,
    isAutoRotateActive: false,

    // Modo atual: 'single' | 'compare'
    mode: 'single',

    // Comparação (gerenciado pelo CompareController)
    leftScene: null,
    rightScene: null,
    leftSyncActive: false,
    rightSyncActive: false,

    // Handlers de eventos mantidos para limpeza
    _listeners: {
        leftChange: null,
        rightChange: null,
        leftSelect: null,
        rightSelect: null,
        syncLeftClick: null,
        syncRightClick: null,
        mobileLeft: null,
        canvasClick: null
    }
};