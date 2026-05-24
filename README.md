# 🧬 Cell Atlas 3D

> Um explorador 3D interativo de células animais e vegetais projetado com **Three.js**. Visualize organelas, realize cortes transversais, isole estruturas e compare modelos lado a lado — tudo diretamente no seu navegador.

---

## ✨ Funcionalidades principais

* **Modelos 3D procedurais** – Renderização fluida em tempo real sem a necessidade de downloads pesados.
* **Corte transversal (Cross-Section)** – Ferramenta de corte para visualização e estudo do interior celular.
* **Isolamento de organelas** – Foco em estruturas específicas acompanhado de painel informativo detalhado.
* **Modo Comparação** – Visualização simultânea lado a lado de duas células distintas para análise.
* **Galeria de microscopia** – Acervo integrado com imagens reais obtidas por microscópios.
* **Design responsivo** – Interface totalmente adaptada para desktops e dispositivos móveis.

---

## 🚀 Como Executar Localmente

Como o projeto é construído em JavaScript puro (Vanilla JS), você não precisa de etapas complexas de build (como npm ou webpack). Basta um servidor local simples.

1. Navegue até o diretório do projeto:
   ```bash
   cd MEU-ATLAS-CELULAR
   ```

2. Inicie um servidor local leve usando Python:
   ```bash
   # Para Python 3.x
   python3 -m http.server 8000
   
   # Caso use Python 2.x
   python -m SimpleHTTPServer 8000
   ```

3. Abra o seu navegador e acesse:
   ```text
   http://localhost:8000
   ```

---

## 📁 Estrutura de Arquivos

Abaixo está o mapeamento dos principais componentes do projeto e suas respectivas responsabilidades:


| Arquivo / Pasta | Descrição técnica |
| :--- | :--- |
| `index.html` | Ponto de entrada do sistema e estrutura da interface do usuário (UI). |
| `celulas.json` | Banco de dados estruturado com as informações textuais das organelas e células. |
| `js/app.js` | Inicializador global e gerenciador do ciclo de vida da aplicação. |
| `js/three-scene.js` | Core gráfico: responsável pelo cenário 3D, luzes e geração procedural das organelas. |
| `js/state.js` | Gerenciamento de estado unificado (célula selecionada, modo de visualização, etc.). |
| `js/controllers/` | Módulos especializados no controle lógico (`Cell`, `Compare`, `UI`). |
| `css/styles.css` | Estilizações visuais e layout da interface de controle da aplicação. |

---

## 🛠️ Tecnologias Utilizadas

* **HTML5 & CSS3** – Estruturação de interface limpa e responsiva.
* **Vanilla JavaScript (ES6+)** – Arquitetura modular sem dependências complexas de frameworks.
* **Three.js** – Engine 3D baseada em WebGL para renderização dos modelos.
* **SDF Library** *(Signed Distance Functions)* – Auxílio na modelagem matemática e geração procedural das geometrias.

---

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo `LICENSE` para mais detalhes.

---
<p align="center">Desenvolvido para fins educacionais e divulgação científica. 🧫</p>
