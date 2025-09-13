import puppeteer, { Browser, Page, ElementHandle } from 'puppeteer';
import { AutomateLoanFormFillingInput, AutomateLoanFormFillingOutput } from '@/ai/flows/rpa-loan-form-agent';

interface RPASession {
  browser: Browser;
  page: Page;
  sessionId: string;
  startTime: Date;
  status: 'active' | 'completed' | 'error';
}

interface FormField {
  selector: string;
  type: 'input' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'file';
  value: any;
  required: boolean;
  label?: string;
}

interface DocumentUpload {
  type: string;
  filePath: string;
  selector: string;
  maxSize?: number;
  allowedFormats?: string[];
}

export class RPAService {
  private sessions: Map<string, RPASession> = new Map();
  private maxRetries = 3;
  private timeout = 30000; // 30 seconds

  /**
   * Start a new RPA session for loan form automation
   */
  async startLoanFormAutomation(input: AutomateLoanFormFillingInput): Promise<string> {
    const sessionId = `rpa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      console.log(`🚀 Starting RPA session ${sessionId} for user ${input.userId}`);

      // Launch browser
      const browser = await puppeteer.launch({
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

      const page = await browser.newPage();

      // Set user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });

      // Create session
      const session: RPASession = {
        browser,
        page,
        sessionId,
        startTime: new Date(),
        status: 'active'
      };

      this.sessions.set(sessionId, session);

      // Start the automation process asynchronously
      this.processLoanForm(session, input).catch(error => {
        console.error(`❌ RPA session ${sessionId} failed:`, error);
        session.status = 'error';
      });

      return sessionId;

    } catch (error) {
      console.error(`❌ Failed to start RPA session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Process the loan form automation
   */
  private async processLoanForm(session: RPASession, input: AutomateLoanFormFillingInput): Promise<void> {
    const { page } = session;

    try {
      console.log(`📝 Processing loan form for session ${session.sessionId}`);

      // Step 1: Navigate to loan portal
      await this.navigateToPortal(page, input.loanPortalUrl);

      // Step 2: Handle authentication if needed
      if (input.userCredentials) {
        await this.handleAuthentication(page, input.userCredentials);
      }

      // Step 3: Navigate to loan application form
      await this.navigateToLoanForm(page);

      // Step 4: Fill personal information
      await this.fillPersonalInformation(page, input.formData.personalInfo);

      // Step 5: Fill business information
      await this.fillBusinessInformation(page, input.formData.businessInfo);

      // Step 6: Fill loan details
      await this.fillLoanDetails(page, input.formData.loanDetails);

      // Step 7: Upload documents
      await this.uploadDocuments(page, input.formData.documents);

      // Step 8: Validate form
      await this.validateForm(page);

      // Step 9: Submit form (if auto-submit enabled)
      if (input.preferences.autoSubmit) {
        await this.submitForm(page);
      }

      // Step 10: Capture confirmation
      const confirmation = await this.captureConfirmation(page);

      session.status = 'completed';
      console.log(`✅ RPA session ${session.sessionId} completed successfully`);

    } catch (error) {
      session.status = 'error';
      console.error(`❌ RPA session ${session.sessionId} failed:`, error);
      throw error;
    }
  }

  /**
   * Navigate to the loan portal
   */
  private async navigateToPortal(page: Page, url: string): Promise<void> {
    console.log(`🌐 Navigating to ${url}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: this.timeout });

    // Wait for page to load completely
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if page loaded successfully
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
  }

  /**
   * Handle portal authentication
   */
  private async handleAuthentication(page: Page, credentials: any): Promise<void> {
    console.log(`🔐 Handling authentication`);

    if (credentials.sessionToken) {
      // Use session token if available
      await page.setCookie({
        name: 'session',
        value: credentials.sessionToken,
        domain: new URL(page.url()).hostname
      });
      await page.reload({ waitUntil: 'networkidle2' });
    } else if (credentials.username && credentials.password) {
      // Handle username/password login
      const usernameSelector = 'input[name="username"], input[name="email"], input[name="user"]';
      const passwordSelector = 'input[name="password"], input[type="password"]';
      const loginButtonSelector = 'button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign In")';

      await page.waitForSelector(usernameSelector, { timeout: 10000 });
      await page.type(usernameSelector, credentials.username);

      await page.waitForSelector(passwordSelector, { timeout: 5000 });
      await page.type(passwordSelector, credentials.password);

      await page.waitForSelector(loginButtonSelector, { timeout: 5000 });
      await page.click(loginButtonSelector);

      // Wait for login to complete
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: this.timeout });
    }

    console.log(`✅ Authentication completed`);
  }

  /**
   * Navigate to loan application form
   */
  private async navigateToLoanForm(page: Page): Promise<void> {
    console.log(`📋 Navigating to loan application form`);

    // Try common selectors for loan application links/buttons
    const selectors = [
      'a:has-text("Apply for Loan")',
      'a:has-text("Loan Application")',
      'a:has-text("New Application")',
      'button:has-text("Apply Now")',
      'button:has-text("Start Application")',
      '[href*="loan"], [href*="application"]'
    ];

    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
          console.log(`✅ Found and clicked loan application link`);
          return;
        }
      } catch (error) {
        continue;
      }
    }

    // If no specific link found, assume we're already on the form page
    console.log(`ℹ️ Assuming already on loan application form`);
  }

  /**
   * Fill personal information section
   */
  private async fillPersonalInformation(page: Page, personalInfo: any): Promise<void> {
    console.log(`👤 Filling personal information`);

    const fields: FormField[] = [
      { selector: 'input[name*="name"], input[name*="fullName"]', type: 'input', value: personalInfo.fullName, required: true },
      { selector: 'input[name*="dob"], input[name*="dateOfBirth"]', type: 'input', value: personalInfo.dateOfBirth, required: true },
      { selector: 'input[name*="pan"], input[name*="panNumber"]', type: 'input', value: personalInfo.panNumber, required: true },
      { selector: 'input[name*="aadhaar"], input[name*="aadhaarNumber"]', type: 'input', value: personalInfo.aadhaarNumber, required: true },
      { selector: 'input[name*="phone"], input[name*="mobile"]', type: 'input', value: personalInfo.phoneNumber, required: true },
      { selector: 'input[name*="email"]', type: 'input', value: personalInfo.email, required: true },
      { selector: 'input[name*="street"], textarea[name*="street"]', type: 'input', value: personalInfo.address.street, required: true },
      { selector: 'input[name*="city"]', type: 'input', value: personalInfo.address.city, required: true },
      { selector: 'select[name*="state"], input[name*="state"]', type: 'input', value: personalInfo.address.state, required: true },
      { selector: 'input[name*="pincode"], input[name*="zip"]', type: 'input', value: personalInfo.address.pincode, required: true }
    ];

    await this.fillFormFields(page, fields);
    console.log(`✅ Personal information filled`);
  }

  /**
   * Fill business information section
   */
  private async fillBusinessInformation(page: Page, businessInfo: any): Promise<void> {
    console.log(`🏢 Filling business information`);

    const fields: FormField[] = [
      { selector: 'input[name*="businessName"], input[name*="companyName"]', type: 'input', value: businessInfo.businessName, required: true },
      { selector: 'select[name*="businessType"], input[name*="businessType"]', type: 'input', value: businessInfo.businessType, required: true },
      { selector: 'input[name*="gst"], input[name*="gstNumber"]', type: 'input', value: businessInfo.gstNumber, required: false },
      { selector: 'input[name*="businessStreet"], textarea[name*="businessStreet"]', type: 'input', value: businessInfo.businessAddress.street, required: true },
      { selector: 'input[name*="businessCity"]', type: 'input', value: businessInfo.businessAddress.city, required: true },
      { selector: 'select[name*="businessState"], input[name*="businessState"]', type: 'input', value: businessInfo.businessAddress.state, required: true },
      { selector: 'input[name*="businessPincode"]', type: 'input', value: businessInfo.businessAddress.pincode, required: true },
      { selector: 'input[name*="turnover"], input[name*="annualTurnover"]', type: 'input', value: businessInfo.annualTurnover.toString(), required: true },
      { selector: 'input[name*="experience"], input[name*="businessExperience"]', type: 'input', value: businessInfo.businessExperience.toString(), required: true }
    ];

    await this.fillFormFields(page, fields);
    console.log(`✅ Business information filled`);
  }

  /**
   * Fill loan details section
   */
  private async fillLoanDetails(page: Page, loanDetails: any): Promise<void> {
    console.log(`💰 Filling loan details`);

    const fields: FormField[] = [
      { selector: 'input[name*="loanAmount"], input[name*="amount"]', type: 'input', value: loanDetails.loanAmount.toString(), required: true },
      { selector: 'input[name*="purpose"], textarea[name*="purpose"]', type: 'input', value: loanDetails.loanPurpose, required: true },
      { selector: 'input[name*="tenure"], select[name*="tenure"]', type: 'input', value: loanDetails.loanTenure.toString(), required: true },
      { selector: 'input[name*="collateral"], select[name*="collateral"]', type: 'input', value: loanDetails.collateralType, required: false }
    ];

    await this.fillFormFields(page, fields);
    console.log(`✅ Loan details filled`);
  }

  /**
   * Upload documents
   */
  private async uploadDocuments(page: Page, documents: any[]): Promise<void> {
    console.log(`📎 Uploading documents`);

    for (const doc of documents) {
      try {
        // Find file input for this document type
        const fileInputSelector = `input[type="file"][name*="${doc.type.toLowerCase()}"], input[type="file"][accept*="${this.getFileExtension(doc.filePath)}"]`;

        const fileInput = await page.$(fileInputSelector) as any;
        if (fileInput) {
          await fileInput.uploadFile(doc.filePath);
          console.log(`✅ Uploaded ${doc.type}`);
        } else {
          console.warn(`⚠️ Could not find file input for ${doc.type}`);
        }
      } catch (error) {
        console.error(`❌ Failed to upload ${doc.type}:`, error);
      }
    }

    console.log(`✅ Document upload completed`);
  }

  /**
   * Fill form fields with retry logic
   */
  private async fillFormFields(page: Page, fields: FormField[]): Promise<void> {
    for (const field of fields) {
      await this.fillFormFieldWithRetry(page, field);
    }
  }

  /**
   * Fill a single form field with retry logic
   */
  private async fillFormFieldWithRetry(page: Page, field: FormField, retries = this.maxRetries): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const element = await page.$(field.selector);

        if (!element) {
          if (attempt === retries) {
            console.warn(`⚠️ Could not find element: ${field.selector}`);
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // Clear existing value
        await element.click({ clickCount: 3 });
        await element.type('');

        // Fill with new value
        if (field.type === 'select') {
          await element.select(field.value);
        } else if (field.type === 'checkbox') {
          if (field.value) {
            await page.evaluate((el) => (el as HTMLInputElement).checked = true, element);
          } else {
            await page.evaluate((el) => (el as HTMLInputElement).checked = false, element);
          }
        } else {
          await element.type(field.value);
        }

        console.log(`✅ Filled field: ${field.selector}`);
        return;

      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed for ${field.selector}:`, error);
        if (attempt === retries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  /**
   * Validate form before submission
   */
  private async validateForm(page: Page): Promise<void> {
    console.log(`🔍 Validating form`);

    // Click any validation buttons
    const validateButtons = [
      'button:has-text("Validate")',
      'button:has-text("Check")',
      'input[type="button"][value*="validate"]'
    ];

    for (const selector of validateButtons) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          break;
        }
      } catch (error) {
        continue;
      }
    }

    // Check for validation errors
    const errorSelectors = [
      '.error',
      '.validation-error',
      '[class*="error"]',
      '.alert-danger'
    ];

    for (const selector of errorSelectors) {
      const errors = await page.$$(selector);
      if (errors.length > 0) {
        console.warn(`⚠️ Found ${errors.length} validation errors`);
        // Could extract and return error messages
      }
    }

    console.log(`✅ Form validation completed`);
  }

  /**
   * Submit the form
   */
  private async submitForm(page: Page): Promise<void> {
    console.log(`📤 Submitting form`);

    const submitButtons = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Apply")',
      'button:has-text("Send")'
    ];

    for (const selector of submitButtons) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: this.timeout });
          console.log(`✅ Form submitted successfully`);
          return;
        }
      } catch (error) {
        continue;
      }
    }

    throw new Error('Could not find submit button');
  }

  /**
   * Capture confirmation details
   */
  private async captureConfirmation(page: Page): Promise<any> {
    console.log(`📋 Capturing confirmation details`);

    const confirmation = {
      applicationId: '',
      trackingNumber: '',
      status: 'submitted',
      portalUrl: page.url()
    };

    // Try to extract application ID
    const idSelectors = [
      '[data-application-id]',
      '[data-tracking-id]',
      'span:has-text("Application ID") + span',
      'div:has-text("Application ID") + div'
    ];

    for (const selector of idSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          confirmation.applicationId = await element.evaluate(el => el.textContent || '');
          break;
        }
      } catch (error) {
        continue;
      }
    }

    console.log(`✅ Confirmation captured:`, confirmation);
    return confirmation;
  }

  /**
   * Get file extension for upload handling
   */
  private getFileExtension(filePath: string): string {
    return filePath.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Get session status
   */
  getSessionStatus(sessionId: string): any {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { status: 'not_found' };
    }

    return {
      sessionId: session.sessionId,
      status: session.status,
      startTime: session.startTime,
      currentUrl: session.page.url(),
      duration: Date.now() - session.startTime.getTime()
    };
  }

  /**
   * Close session and cleanup
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      await session.browser.close();
      this.sessions.delete(sessionId);
      console.log(`🧹 Session ${sessionId} closed and cleaned up`);
    }
  }

  /**
   * Close all sessions
   */
  async closeAllSessions(): Promise<void> {
    for (const [sessionId, session] of this.sessions) {
      await session.browser.close();
    }
    this.sessions.clear();
    console.log(`🧹 All RPA sessions closed`);
  }
}

// Singleton instance
let rpaService: RPAService | null = null;

export function getRPAService(): RPAService {
  if (!rpaService) {
    rpaService = new RPAService();
  }
  return rpaService;
}