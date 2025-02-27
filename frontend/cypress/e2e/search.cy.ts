describe('Search Functionality', () => {
    beforeEach(() => {
      // Login before each test
      cy.visit('/auth/login');
      cy.get('input[name="email"]').type('test@example.com');
      cy.get('input[name="password"]').type('password123');
      cy.get('button[type="submit"]').click();
    });
  
    it('should perform a basic search', () => {
      cy.visit('/search');
      
      cy.get('input[name="searchQuery"]').type('machine learning');
      cy.get('button[type="submit"]').click();
      
      cy.get('[data-testid="search-results"]').should('be.visible');
      cy.get('[data-testid="result-card"]').should('have.length.greaterThan', 0);
    });
  
    it('should apply filters to search', () => {
      cy.visit('/search');
      
      cy.get('input[name="searchQuery"]').type('machine learning');
      
      // Apply date filter
      cy.get('[data-testid="date-filter"]').click();
      cy.get('[data-testid="date-from"]').type('2020-01-01');
      cy.get('[data-testid="apply-filters"]').click();
      
      cy.get('button[type="submit"]').click();
      
      cy.get('[data-testid="search-results"]').should('be.visible');
    });
  
    it('should save a search', () => {
      cy.visit('/search');
      
      cy.get('input[name="searchQuery"]').type('machine learning');
      cy.get('button[type="submit"]').click();
      
      cy.get('[data-testid="save-search-button"]').click();
      cy.get('input[name="searchName"]').type('ML Research');
      cy.get('[data-testid="confirm-save"]').click();
      
      cy.contains('Search saved successfully').should('be.visible');
    });
  });