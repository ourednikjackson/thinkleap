// Login helper command
declare namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>
      apiLogin(): Chainable<Cypress.Response<any>>
    }
  }

Cypress.Commands.add('login', (email, password) => {
    cy.visit('/auth/login');
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
  });
  
  // API login helper
  Cypress.Commands.add('apiLogin', () => {
    return cy.request({
      method: 'POST',
      url: `${Cypress.env('API_URL')}/api/auth/login`,
      body: {
        email: Cypress.env('TEST_USER_EMAIL'),
        password: Cypress.env('TEST_USER_PASSWORD')
      }
    }).then((response) => {
      localStorage.setItem('accessToken', response.body.accessToken);
      cy.setCookie('refreshToken', response.body.refreshToken);
    });
  });