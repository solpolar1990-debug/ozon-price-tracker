/**
 * Z-AI SDK Wrapper
 * Поддерживает переменные окружения для Vercel
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface ZAIConfig {
  baseUrl: string;
  apiKey: string;
  chatId?: string;
  userId?: string;
}

// Загрузка конфигурации
async function loadConfig(): Promise<ZAIConfig> {
  // Сначала проверяем переменные окружения (для Vercel)
  const envBaseUrl = process.env.ZAI_BASE_URL;
  const envApiKey = process.env.ZAI_API_KEY;
  
  if (envBaseUrl && envApiKey) {
    console.log('Using Z-AI config from environment variables');
    return {
      baseUrl: envBaseUrl,
      apiKey: envApiKey,
      chatId: process.env.ZAI_CHAT_ID,
      userId: process.env.ZAI_USER_ID,
    };
  }
  
  // Затем ищем файл конфигурации
  const homeDir = os.homedir();
  const configPaths = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(homeDir, '.z-ai-config'),
    '/etc/.z-ai-config'
  ];
  
  for (const filePath of configPaths) {
    try {
      const configStr = await fs.readFile(filePath, 'utf-8');
      const config = JSON.parse(configStr);
      if (config.baseUrl && config.apiKey) {
        console.log(`Using Z-AI config from ${filePath}`);
        return config;
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error(`Error reading config at ${filePath}:`, error);
      }
    }
  }
  
  throw new Error('Z-AI config not found. Set ZAI_BASE_URL and ZAI_API_KEY env vars or create .z-ai-config file');
}

// Класс Z-AI клиента
class ZAIClient {
  private config: ZAIConfig;
  
  constructor(config: ZAIConfig) {
    this.config = config;
  }
  
  // Web search функция
  async webSearch(query: string, num: number = 5): Promise<any[]> {
    const { baseUrl, apiKey } = this.config;
    const url = `${baseUrl}/functions/invoke`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        function: 'web_search',
        parameters: { query, num }
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Web search failed: ${response.status} - ${errorText}`);
    }
    
    return await response.json();
  }
  
  // Общий метод для вызова функций
  async invokeFunction(name: string, params: any): Promise<any> {
    const { baseUrl, apiKey } = this.config;
    const url = `${baseUrl}/functions/invoke`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        function: name,
        parameters: params
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Function ${name} failed: ${response.status} - ${errorText}`);
    }
    
    return await response.json();
  }
  
  static async create(): Promise<ZAIClient> {
    const config = await loadConfig();
    return new ZAIClient(config);
  }
}

export default ZAIClient;
export { loadConfig };
