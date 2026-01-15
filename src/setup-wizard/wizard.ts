/**
 * Interactive setup wizard
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';
import { resolveCredentials } from '../lib/cookies.js';

export interface SetupConfig {
  twitter: {
    authToken: string;
    ct0: string;
  };
  output: {
    archiveFile: string;
    knowledgeDir: string;
  };
  enrichment: {
    expandUrls: boolean;
    extractContent: boolean;
  };
  categorization: {
    enabled: boolean;
  };
  timezone: string;
}

export class SetupWizard {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({ input, output });
  }

  /**
   * Run the setup wizard
   */
  async run(): Promise<SetupConfig> {
    console.log('\n🚀 Welcome to xKit Setup Wizard!\n');
    console.log('This wizard will help you configure xKit for bookmark archiving.\n');

    const config: SetupConfig = {
      twitter: {
        authToken: '',
        ct0: '',
      },
      output: {
        archiveFile: './bookmarks.md',
        knowledgeDir: './knowledge',
      },
      enrichment: {
        expandUrls: true,
        extractContent: true,
      },
      categorization: {
        enabled: true,
      },
      timezone: 'America/New_York',
    };

    // Step 1: Twitter credentials
    console.log('📱 Step 1: Twitter/X Credentials\n');

    const autoDetect = await this.ask('Would you like to auto-detect credentials from your browser? (y/n)', 'y');

    if (autoDetect.toLowerCase() === 'y') {
      await this.detectCredentials(config);
    } else {
      await this.manualCredentials(config);
    }

    // Step 2: Output configuration
    console.log('\n📁 Step 2: Output Configuration\n');

    config.output.archiveFile = await this.ask('Archive file path:', './bookmarks.md');

    config.output.knowledgeDir = await this.ask('Knowledge base directory:', './knowledge');

    // Step 3: Features
    console.log('\n⚙️  Step 3: Features\n');

    const expandUrls = await this.ask('Expand t.co URLs? (y/n)', 'y');
    config.enrichment.expandUrls = expandUrls.toLowerCase() === 'y';

    const extractContent = await this.ask('Extract content from linked pages? (y/n)', 'y');
    config.enrichment.extractContent = extractContent.toLowerCase() === 'y';

    const categorize = await this.ask('Enable automatic categorization? (y/n)', 'y');
    config.categorization.enabled = categorize.toLowerCase() === 'y';

    // Step 4: Timezone
    console.log('\n🌍 Step 4: Timezone\n');

    config.timezone = await this.ask('Timezone (e.g., America/New_York):', 'America/New_York');

    // Step 5: Create directories and config
    console.log('\n📝 Step 5: Creating Configuration\n');

    await this.createDirectories(config);
    await this.saveConfig(config);

    // Step 6: Test connection
    console.log('\n🔍 Step 6: Testing Connection\n');

    const testConnection = await this.ask('Would you like to test the connection? (y/n)', 'y');

    if (testConnection.toLowerCase() === 'y') {
      await this.testConnection(config);
    }

    console.log('\n✅ Setup complete!\n');
    console.log('You can now run:');
    console.log('  xkit bookmarks archive    # Archive bookmarks to markdown');
    console.log('  xkit bookmarks -n 20      # Fetch 20 bookmarks');
    console.log('\n');

    this.rl.close();

    return config;
  }

  /**
   * Ask a question with default value
   */
  private async ask(question: string, defaultValue?: string): Promise<string> {
    const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;

    const answer = await this.rl.question(prompt);
    return answer.trim() || defaultValue || '';
  }

  /**
   * Auto-detect credentials from browser
   */
  private async detectCredentials(config: SetupConfig): Promise<void> {
    console.log('Detecting credentials from browser...\n');

    try {
      const { cookies, warnings } = await resolveCredentials({
        cookieSource: ['safari', 'chrome', 'firefox'],
      });

      if (warnings.length > 0) {
        for (const warning of warnings) {
          console.log(`⚠️  ${warning}`);
        }
      }

      if (cookies.authToken && cookies.ct0) {
        config.twitter.authToken = cookies.authToken;
        config.twitter.ct0 = cookies.ct0;
        console.log('✅ Credentials detected successfully!\n');
      } else {
        console.log('❌ Could not detect credentials automatically.\n');
        await this.manualCredentials(config);
      }
    } catch (error) {
      console.log('❌ Error detecting credentials:', error);
      await this.manualCredentials(config);
    }
  }

  /**
   * Manual credential entry
   */
  private async manualCredentials(config: SetupConfig): Promise<void> {
    console.log('Please enter your Twitter/X credentials manually.\n');
    console.log('To find these:');
    console.log('1. Open Twitter/X in your browser');
    console.log('2. Open Developer Tools → Application → Cookies');
    console.log('3. Find auth_token and ct0 values\n');

    config.twitter.authToken = await this.ask('auth_token');
    config.twitter.ct0 = await this.ask('ct0');
  }

  /**
   * Create necessary directories
   */
  private async createDirectories(config: SetupConfig): Promise<void> {
    const dirs = [
      config.output.knowledgeDir,
      join(config.output.knowledgeDir, 'tools'),
      join(config.output.knowledgeDir, 'articles'),
      join(config.output.knowledgeDir, 'videos'),
      join(config.output.knowledgeDir, 'podcasts'),
      '.xkit',
      '.xkit/state',
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    }
  }

  /**
   * Save configuration to file
   */
  private async saveConfig(config: SetupConfig): Promise<void> {
    const configPath = '.xkitrc.json5';

    const configContent = {
      twitter: {
        authToken: config.twitter.authToken,
        ct0: config.twitter.ct0,
      },
      output: config.output,
      enrichment: config.enrichment,
      categorization: config.categorization,
      timezone: config.timezone,
    };

    writeFileSync(configPath, JSON.stringify(configContent, null, 2), 'utf-8');

    console.log(`\nConfiguration saved to: ${configPath}`);
    console.log('⚠️  This file contains credentials - do not commit to git!\n');
  }

  /**
   * Test connection to Twitter
   */
  private async testConnection(config: SetupConfig): Promise<void> {
    try {
      const { TwitterClient } = await import('../lib/twitter-client.js');

      const client = new TwitterClient({
        cookies: {
          authToken: config.twitter.authToken,
          ct0: config.twitter.ct0,
        },
      });

      console.log('Testing connection...');

      // Try to fetch current user
      const result = await client.getCurrentUser();

      if (result.success && result.user) {
        console.log(`✅ Connected as @${result.user.username} (${result.user.name})\n`);
      } else {
        console.log(`❌ Connection failed: ${result.error}\n`);
      }
    } catch (error) {
      console.log(`❌ Connection test failed:`, error);
    }
  }
}
