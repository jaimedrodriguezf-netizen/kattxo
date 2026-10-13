import { PopupController } from './controller';

document.addEventListener('DOMContentLoaded', () => {
  const controller = new PopupController();
  controller.init().catch((err) => {
    console.error('[Kattxo SRI] Error inicializando Popup Controller:', err);
  });
});
