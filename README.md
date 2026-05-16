# 🧬 Cell Atlas 3D

**Cell Atlas 3D** é uma aplicação educacional interativa construída com **Three.js**, que permite explorar células eucarióticas em 3D, visualizar organelas em tempo real, alternar entre modos de visualização e comparar diferentes tipos celulares lado a lado.

O projeto combina **renderização 3D, geração procedural, carregamento de modelos GLB e arquitetura modular de frontend** para criar uma experiência imersiva de biologia celular.

👨‍💻 **Autor:** Erick Rocha

---

## 🚀 Demonstração

- Visualização 3D interativa de células animais e vegetais
- Exploração de organelas com isolamento dinâmico
- Corte transversal (cross-section)
- Modo comparação entre células
- Fallback procedural quando modelos 3D não estão disponíveis
- Interface responsiva com layout em 3 colunas

---

## 🧠 Principais Funcionalidades

### 🔬 Visualização 3D

- Renderização com **Three.js (WebGL)**
- Suporte a modelos `.glb`
- Iluminação dinâmica e sombras
- Controle de câmera com OrbitControls

### 🧬 Simulação Biológica

- Mapeamento de organelas por tipo celular
- Distribuição espacial baseada em zonas biológicas (nuclear, perinuclear, citoplasmática, periférica)
- Diferença entre células **Animalia** e **Plantae**

### ⚙️ Sistema Procedural (Fallback)

- Geração automática de células caso o modelo falhe
- Layout baseado em regras biológicas
- Clusters (ribossomos), stacks (Golgi) e distribuição aleatória controlada

### 🔄 Interatividade

- Isolamento de organelas
- Reset de câmera
- Auto-rotação
- Corte transversal (clipping plane)
- Download de modelo GLB

### ⚖️ Modo Comparação

- Visualização lado a lado de duas células
- Sincronização de câmera independente (esquerda → direita ou direita → esquerda)
- Carregamento independente por cena WebGL

---

## 🏗️ Estrutura do Projeto (ASCII Tree)

meu-atlas-celular/
├── assets/
│ ├── images/microscope/
│ └── models/
├── css/
│ └── styles.css
├── js/
│ ├── controllers/
│ │ ├── cellcontroller.js
│ │ ├── comparecontroller.js
│ │ └── uicontroller.js
│ ├── app.js
│ ├── cell-layout-engine.js
│ ├── state.js
│ └── three-scene.js
├── celulas.json
└── index.html


> ⚠️ **Nota sobre nomes de arquivos:**  
> Os imports no código utilizam os nomes exatamente como acima (minúsculos). Mantenha essa consistência para evitar erros em servidores case‑sensitive (Linux, GitHub Pages).

---

## 🧩 Arquitetura do Projeto

O sistema foi estruturado com separação clara de responsabilidades:

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| Bootstrap | `app.js` | Inicialização, eventos globais, menus mobile |
| Estado | `state.js` | `AppState` e `CompareState` (global) |
| Engine 3D | `three-scene.js` | `ThreeSceneManager`: cena, câmera, renderer, carregamento GLB, fallback |
| Layout biológico | `cell-layout-engine.js` | `CellLayoutEngine`: geração procedural de organelas |
| Controladores | `controllers/` | `cellcontroller`, `comparecontroller`, `uicontroller` – orquestração UI e fluxo |

### 🧠 Componentes principais

- **ThreeSceneManager** → Gerencia toda a cena WebGL (loop de renderização sob demanda, clipping planes, isolamento)
- **CellLayoutEngine** → Geração procedural de organelas com distribuição espacial realista
- **AppState / CompareState** → Controle global de estado com listeners e tokens de concorrência
- **Controllers** → Isolam a lógica de DOM e eventos da engine 3D

---

## 🧬 Modelo de Dados (celulas.json)

As células são carregadas via JSON. Exemplo:

```json
{
  "id": "animal-cell",
  "nome": "Animal Cell",
  "tipo": "Eukaryotic Cell",
  "categoria": "Animalia",
  "arquivo_3d": "./assets/models/animal_cell.glb",
  "imagens_microscopio": {
    "light": "./assets/images/microscope/animal_light.jpg",
    "stained": "./assets/images/microscope/animal_stained.jpg",
    "electron": "./assets/images/microscope/animal_electron.jpg"
  },
  "organelas": [
    {
      "id": "nucleus",
      "nome": "Núcleo",
      "descricao": "Contém o DNA e coordena as atividades celulares.",
      "mesh_name": "Cube001_Nucleus"
    }
  ]
}

⚙️ Tecnologias Utilizadas
Three.js r157 – motor 3D

JavaScript ES Modules – organização modular

WebGL – renderização acelerada por GPU

HTML5 / CSS3 – Grid Layout + Flexbox, variáveis CSS

AbortController – controle de concorrência em carregamentos

GLTFLoader – carregamento de modelos .glb

OrbitControls – interação com câmera

🧪 Destaques Técnicos
🧠 Engine híbrida (GLB + fallback procedural)
Caso o modelo 3D não carregue (arquivo ausente ou erro de rede), o sistema gera automaticamente uma célula funcional com organelas posicionadas por regras biológicas – sem perda de interatividade.

🔄 Controle de concorrência
AbortController para cancelar requisições anteriores

Tokens de corrida (currentLoadToken) para evitar race conditions

Proteção contra sobrescrita de cenas durante carregamento assíncrono

🎮 Renderização otimizada (smart rendering)
Loop de renderização pausado quando ocioso (sem interação e sem auto-rotação)

Reinício automático ao interagir ou ativar auto-rotação

Economia de CPU/GPU em segundo plano

📱 Responsividade
Layout desktop em 3 colunas fixas

Sidebars adaptáveis para mobile (off-canvas com transform)

Modo comparação adaptado para telas menores (grid 1 coluna)

🧭 Possíveis melhorias futuras
✨ Instancing de geometria para otimizar múltiplas organelas

🧠 Pipeline reativo com store global (ex: Zustand)

🧩 LOD (Level of Detail) para organelas distantes

🌿 Suporte a outros tipos celulares (fungos, protozoários)

🎥 Animações biológicas (transporte de vesículas, fluxo citoplasmático)

🎓 Modo educativo guiado com tutorial interativo

👨‍💻 Autor
Erick Rocha
Projeto desenvolvido como sistema educacional e experimental de visualização 3D aplicada à biologia celular.

📄 Licença
Este projeto é de uso educacional e experimental.
Para dúvidas ou permissões, entre em contato com o autor.