import app from './app';
import { config } from './config';

app.listen(config.PORT, () => {
  config.logger.info(`Server listening on port ${config.PORT}`);
});