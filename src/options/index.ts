import { OptionsController } from './controller';

document.addEventListener('DOMContentLoaded', () => {
  const controller = new OptionsController();
  controller.init().catch((err) => {
    console.error('[Kattxo SRI] Error inicializando Options Controller:', err);
  });
});
