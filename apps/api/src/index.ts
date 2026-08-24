import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { app } from './app';

const PORT = process.env.API_PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 ReelFlow API Server running on port ${PORT}`);
});
