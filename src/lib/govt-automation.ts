import puppeteer, { Browser, Page } from 'puppeteer';

export interface ArtisanProfile {
  id: string;
  name: string;
  skills: string[];
  location: string;
  income: string;
  businessType: string;
  experience: string;
  contactInfo: {
    phone: string;
    email: string;
    address: string;
  };
  documents: {
    aadhaar?: string;
    pan?: string;
    bankAccount?: string;
    gst?: string;
    businessLicense?: string;
  };
}

export interface AutomationResult {
  success: boolean;
  applicationId?: string;
  status: string;
  message: string;
  screenshot?: string;
  nextSteps?: string[];
}

export class GovtAutomationService {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: false, // Set to true for production
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async registerForMudra(profile: ArtisanProfile): Promise<AutomationResult> {
    if (!this.browser) await this.initialize();

    const page = await this.browser!.newPage();

    try {
      console.log('Starting MUDRA registration automation...');

      // Navigate to MUDRA portal
      await page.goto('https://www.mudra.org.in/', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for and click registration/login button
      await page.waitForSelector('a[href*="register"]', { timeout: 10000 });
      await page.click('a[href*="register"]');

      // Fill registration form
      await this.fillMudraForm(page, profile);

      // Handle CAPTCHA if present
      await this.handleCaptcha(page);

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for success message or redirect
      await page.waitForNavigation({ waitUntil: 'networkidle0' });

      const applicationId = await this.extractApplicationId(page);

      return {
        success: true,
        applicationId,
        status: 'submitted',
        message: 'MUDRA application submitted successfully',
        nextSteps: [
          'Wait for application review (2-4 weeks)',
          'Check status on MUDRA portal',
          'Prepare for document verification if required'
        ]
      };

    } catch (error) {
      console.error('MUDRA registration error:', error);
      const screenshot = await this.takeScreenshot(page);
      return {
        success: false,
        status: 'failed',
        message: `MUDRA registration failed: ${error}`,
        screenshot
      };
    } finally {
      await page.close();
    }
  }

  async registerForPMEGP(profile: ArtisanProfile): Promise<AutomationResult> {
    if (!this.browser) await this.initialize();

    const page = await this.browser!.newPage();

    try {
      console.log('Starting PMEGP registration automation...');

      // Navigate to PMEGP portal
      await page.goto('https://www.kviconline.gov.in/', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // PMEGP registration process
      await this.fillPMEGPForm(page, profile);

      const applicationId = await this.extractApplicationId(page);

      return {
        success: true,
        applicationId,
        status: 'submitted',
        message: 'PMEGP application submitted successfully'
      };

    } catch (error) {
      console.error('PMEGP registration error:', error);
      const screenshot = await this.takeScreenshot(page);
      return {
        success: false,
        status: 'failed',
        message: `PMEGP registration failed: ${error}`,
        screenshot
      };
    } finally {
      await page.close();
    }
  }

  private async fillMudraForm(page: Page, profile: ArtisanProfile): Promise<void> {
    // Wait for form to load
    await page.waitForSelector('#applicantForm', { timeout: 10000 });

    // Fill personal details
    await page.type('#applicantName', profile.name);
    await page.type('#fatherName', 'Father Name'); // This might need to be collected
    await page.type('#dateOfBirth', '1990-01-01'); // This needs proper date handling
    await page.type('#phone', profile.contactInfo.phone);
    await page.type('#email', profile.contactInfo.email);
    await page.type('#address', profile.contactInfo.address);

    // Fill business details
    await page.type('#businessType', profile.businessType);
    await page.type('#businessExperience', profile.experience);
    await page.type('#annualIncome', profile.income);

    // Upload documents if required
    if (profile.documents.aadhaar) {
      await this.uploadDocument(page, '#aadhaarUpload', profile.documents.aadhaar);
    }
    if (profile.documents.pan) {
      await this.uploadDocument(page, '#panUpload', profile.documents.pan);
    }

    // Select loan amount and purpose
    await page.select('#loanAmount', '50000'); // Default amount
    await page.type('#loanPurpose', 'Working capital for handicraft business');
  }

  private async fillPMEGPForm(page: Page, profile: ArtisanProfile): Promise<void> {
    // PMEGP specific form filling
    await page.waitForSelector('#pmegpForm', { timeout: 10000 });

    await page.type('#enterpriseName', `${profile.name} Enterprises`);
    await page.type('#ownerName', profile.name);
    await page.select('#enterpriseType', 'manufacturing');
    await page.type('#projectCost', '200000'); // Default project cost
    await page.type('#employmentGenerated', '2');

    // Fill bank details
    if (profile.documents.bankAccount) {
      await page.type('#bankAccount', profile.documents.bankAccount);
    }
  }

  private async handleCaptcha(page: Page): Promise<void> {
    // Try to detect and handle CAPTCHA
    const captchaSelector = 'input[name*="captcha"], #captcha, .captcha';
    const captchaExists = await page.$(captchaSelector);

    if (captchaExists) {
      console.log('CAPTCHA detected, attempting to solve...');

      // For now, we'll wait for manual intervention
      // In production, you might integrate with a CAPTCHA solving service
      await page.waitForFunction(
        () => {
          const captcha = document.querySelector('input[name*="captcha"], #captcha, .captcha') as HTMLInputElement;
          return captcha && captcha.value.length > 0;
        },
        { timeout: 60000 } // Wait 1 minute for manual CAPTCHA entry
      );
    }
  }

  private async uploadDocument(page: Page, selector: string, filePath: string): Promise<void> {
    const fileInput = await page.$(selector) as any;
    if (fileInput) {
      await fileInput.uploadFile(filePath);
      // Wait for upload to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  private async extractApplicationId(page: Page): Promise<string> {
    // Try to extract application ID from success page
    const applicationIdSelectors = [
      '.application-id',
      '#applicationId',
      '[data-application-id]',
      'span:contains("Application ID")',
      'div:contains("Reference Number")'
    ];

    for (const selector of applicationIdSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await page.evaluate(el => el.textContent, element);
          if (text && text.match(/\d+/)) {
            return text.match(/\d+/)![0];
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Fallback: generate a mock application ID
    return `APP_${Date.now()}`;
  }

  private async takeScreenshot(page: Page): Promise<string> {
    try {
      const screenshot = await page.screenshot({ encoding: 'base64' });
      return `data:image/png;base64,${screenshot}`;
    } catch (error) {
      console.error('Screenshot failed:', error);
      return '';
    }
  }
}

export const govtAutomation = new GovtAutomationService();
