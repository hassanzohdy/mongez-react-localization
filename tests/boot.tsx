import ReactDOM from "react-dom/client";

let containerElement;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  containerElement = document.createElement("div");
  document.body.appendChild(containerElement);
});

afterEach(() => {
  document.body.removeChild(containerElement);
  containerElement = null;
});

export function render(children) {
  ReactDOM.createRoot(containerElement).render(children);

  return containerElement;
}

export function container(): HTMLElement {
  return containerElement;
}
