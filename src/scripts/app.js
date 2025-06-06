import { StoryModel } from './models/StoryModel.js';
import { StoryView } from './views/StoryView.js';
import { StoryPresenter } from './presenters/StoryPresenter.js';

document.addEventListener('DOMContentLoaded', () => {
  const model = new StoryModel();
  const view = new StoryView();
  const presenter = new StoryPresenter(model, view);
}); 