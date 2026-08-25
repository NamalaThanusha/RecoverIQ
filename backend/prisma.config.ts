import { defineConfig, env } from '@prisma/config';
import 'dotenv/config';

export default defineConfig({
  earlyAccess: true,
  datasource: {
    url: env('DIRECT_URL'),
  }
});
