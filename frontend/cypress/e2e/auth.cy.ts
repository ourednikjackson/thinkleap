describe('Authentication Flow', () => {
    it('should allow users to sign up', () => {
      cy.visit('/auth/signup');
      
      // Fill out signup form
      cy.get('input[name="email"]').type('test@example.com');
      cy.get('input[name="password"]').type('password123');
      cy.get('input[name="confirmPassword"]').type('password123');
      cy.get('button[type="submit"]').click();
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
    });
  
    it('should allow users to login', () => {
      cy.visit('/auth/login');
      
      cy.get('input[name="email"]').type('test@example.com');
      cy.get('input[name="password"]').type('password123');
      cy.get('button[type="submit"]').click();
      
      cy.url().should('include', '/dashboard');
    });
  
    it('should handle password reset flow', () => {
      cy.visit('/auth/forgot-password');
      
      cy.get('input[name="email"]').type('test@example.com');
      cy.get('button[type="submit"]').click();
      
      cy.contains('Check your email').should('be.visible');
    });
  });