/**
 * PDF Export utilities for formulas
 * Uses browser-based PDF generation for client-side exports
 */

export interface FormulaPrintData {
  id: string
  name: string
  description?: string
  instructions?: string
  category?: string
  difficulty?: string
  preparationTime?: number
  yieldAmount?: number
  yieldUnit?: string
  dosage?: string
  duration?: string
  contraindications?: string
  interactions?: string
  version: number
  createdAt: string
  updatedAt: string
  creator: {
    name: string
    email: string
  }
  ingredients: Array<{
    herbName: string
    quantity: number
    unit: string
    notes?: string
    processingNotes?: string
    costPerUnit?: number
    totalCost?: number
  }>
  costBreakdown?: {
    baseIngredientsCost: number
    laborCost: number
    overheadCost: number
    totalCost: number
    suggestedPrice: number
    profitMargin: number
  }
}

export interface PrintOptions {
  includeIngredients: boolean
  includeCosts: boolean
  includeInstructions: boolean
  includeSafetyInfo: boolean
  includeMetadata: boolean
  format: "recipe" | "full" | "label"
  paperSize: "letter" | "a4"
  orientation: "portrait" | "landscape"
}

export class FormulaPDFExporter {
  /**
   * Generate a print-friendly HTML string for the formula
   */
  static generatePrintHTML(formula: FormulaPrintData, options: PrintOptions): string {
    const { format, includeIngredients, includeCosts, includeInstructions, includeSafetyInfo, includeMetadata } = options

    switch (format) {
      case "recipe":
        return this.generateRecipeHTML(formula, options)
      case "label":
        return this.generateLabelHTML(formula, options)
      case "full":
      default:
        return this.generateFullHTML(formula, options)
    }
  }

  /**
   * Generate full detailed formula PDF
   */
  private static generateFullHTML(formula: FormulaPrintData, options: PrintOptions): string {
    const currentDate = new Date().toLocaleDateString()
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${formula.name} - Formula</title>
        <style>
          ${this.getBaseStyles(options.paperSize, options.orientation)}
          .formula-header {
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 1rem;
            margin-bottom: 2rem;
          }
          .formula-title {
            font-size: 2rem;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 0.5rem;
          }
          .formula-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
          }
          .meta-item {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem;
            background-color: #f9fafb;
            border-radius: 0.375rem;
          }
          .section {
            margin-bottom: 2rem;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: #374151;
            margin-bottom: 1rem;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 0.5rem;
          }
          .ingredients-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1rem;
          }
          .ingredients-table th,
          .ingredients-table td {
            border: 1px solid #d1d5db;
            padding: 0.75rem;
            text-align: left;
          }
          .ingredients-table th {
            background-color: #f3f4f6;
            font-weight: 600;
          }
          .ingredients-table tr:nth-child(even) {
            background-color: #f9fafb;
          }
          .cost-summary {
            background-color: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 0.5rem;
            padding: 1rem;
            margin-top: 1rem;
          }
          .cost-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
          }
          .cost-total {
            font-weight: bold;
            border-top: 1px solid #0ea5e9;
            padding-top: 0.5rem;
          }
          .instructions {
            background-color: #fefce8;
            border: 1px solid #eab308;
            border-radius: 0.5rem;
            padding: 1rem;
            white-space: pre-wrap;
            line-height: 1.6;
          }
          .safety-info {
            background-color: #fef2f2;
            border: 1px solid #ef4444;
            border-radius: 0.5rem;
            padding: 1rem;
            margin-top: 1rem;
          }
          .safety-section {
            margin-bottom: 1rem;
          }
          .safety-label {
            font-weight: 600;
            color: #dc2626;
            margin-bottom: 0.25rem;
          }
          .footer {
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid #e5e7eb;
            font-size: 0.875rem;
            color: #6b7280;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="formula-header">
          <h1 class="formula-title">${formula.name}</h1>
          ${formula.description ? `<p class="text-gray-600">${formula.description}</p>` : ''}
          
          ${includeMetadata ? `
            <div class="formula-meta">
              <div class="meta-item">
                <span>Category:</span>
                <span>${formula.category || 'Not specified'}</span>
              </div>
              <div class="meta-item">
                <span>Difficulty:</span>
                <span>${formula.difficulty || 'Not specified'}</span>
              </div>
              <div class="meta-item">
                <span>Yield:</span>
                <span>${formula.yieldAmount || ''} ${formula.yieldUnit || ''}</span>
              </div>
              <div class="meta-item">
                <span>Prep Time:</span>
                <span>${formula.preparationTime ? `${formula.preparationTime} minutes` : 'Not specified'}</span>
              </div>
              <div class="meta-item">
                <span>Version:</span>
                <span>v${formula.version}</span>
              </div>
              <div class="meta-item">
                <span>Created by:</span>
                <span>${formula.creator.name}</span>
              </div>
            </div>
          ` : ''}
        </div>

        ${includeIngredients ? `
          <div class="section">
            <h2 class="section-title">Ingredients</h2>
            <table class="ingredients-table">
              <thead>
                <tr>
                  <th>Herb</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  ${includeCosts ? '<th>Cost per Unit</th><th>Total Cost</th>' : ''}
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${formula.ingredients.map(ingredient => `
                  <tr>
                    <td>${ingredient.herbName}</td>
                    <td>${ingredient.quantity}</td>
                    <td>${ingredient.unit}</td>
                    ${includeCosts ? `
                      <td>$${ingredient.costPerUnit?.toFixed(2) || '0.00'}</td>
                      <td>$${ingredient.totalCost?.toFixed(2) || '0.00'}</td>
                    ` : ''}
                    <td>${ingredient.processingNotes || ingredient.notes || ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            ${includeCosts && formula.costBreakdown ? `
              <div class="cost-summary">
                <h3 style="margin-top: 0; color: #0369a1;">Cost Breakdown</h3>
                <div class="cost-row">
                  <span>Ingredients Cost:</span>
                  <span>$${formula.costBreakdown.baseIngredientsCost.toFixed(2)}</span>
                </div>
                <div class="cost-row">
                  <span>Labor Cost:</span>
                  <span>$${formula.costBreakdown.laborCost.toFixed(2)}</span>
                </div>
                <div class="cost-row">
                  <span>Overhead Cost:</span>
                  <span>$${formula.costBreakdown.overheadCost.toFixed(2)}</span>
                </div>
                <div class="cost-row cost-total">
                  <span>Total Cost:</span>
                  <span>$${formula.costBreakdown.totalCost.toFixed(2)}</span>
                </div>
                <div class="cost-row cost-total">
                  <span>Suggested Price:</span>
                  <span>$${formula.costBreakdown.suggestedPrice.toFixed(2)}</span>
                </div>
                <div class="cost-row">
                  <span>Profit Margin:</span>
                  <span>${formula.costBreakdown.profitMargin.toFixed(1)}%</span>
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        ${includeInstructions && formula.instructions ? `
          <div class="section">
            <h2 class="section-title">Preparation Instructions</h2>
            <div class="instructions">${formula.instructions}</div>
          </div>
        ` : ''}

        ${includeSafetyInfo ? `
          <div class="section">
            <h2 class="section-title">Safety & Usage Information</h2>
            <div class="safety-info">
              ${formula.dosage ? `
                <div class="safety-section">
                  <div class="safety-label">Dosage:</div>
                  <div>${formula.dosage}</div>
                </div>
              ` : ''}
              
              ${formula.duration ? `
                <div class="safety-section">
                  <div class="safety-label">Duration:</div>
                  <div>${formula.duration}</div>
                </div>
              ` : ''}
              
              ${formula.contraindications ? `
                <div class="safety-section">
                  <div class="safety-label">Contraindications:</div>
                  <div>${formula.contraindications}</div>
                </div>
              ` : ''}
              
              ${formula.interactions ? `
                <div class="safety-section">
                  <div class="safety-label">Interactions:</div>
                  <div>${formula.interactions}</div>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <div class="footer">
          <span>Generated on ${currentDate}</span>
          <span>HerbalistHub - Formula v${formula.version}</span>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Generate recipe-style format (simplified)
   */
  private static generateRecipeHTML(formula: FormulaPrintData, options: PrintOptions): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${formula.name} - Recipe</title>
        <style>
          ${this.getBaseStyles(options.paperSize, options.orientation)}
          .recipe-header {
            text-align: center;
            margin-bottom: 2rem;
            border-bottom: 2px solid #374151;
            padding-bottom: 1rem;
          }
          .recipe-title {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
          }
          .recipe-subtitle {
            font-size: 1.125rem;
            color: #6b7280;
          }
          .ingredients-list {
            background-color: #f9fafb;
            border-radius: 0.5rem;
            padding: 1.5rem;
            margin-bottom: 2rem;
          }
          .ingredient-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .ingredient-item:last-child {
            border-bottom: none;
          }
          .ingredient-name {
            font-weight: 500;
          }
          .ingredient-amount {
            font-weight: 600;
            color: #059669;
          }
          .instructions-section {
            background-color: #fffbeb;
            border-radius: 0.5rem;
            padding: 1.5rem;
            margin-bottom: 2rem;
          }
          .instructions-title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: #92400e;
          }
        </style>
      </head>
      <body>
        <div class="recipe-header">
          <h1 class="recipe-title">${formula.name}</h1>
          <p class="recipe-subtitle">
            Makes ${formula.yieldAmount || ''} ${formula.yieldUnit || ''} 
            ${formula.preparationTime ? ` • ${formula.preparationTime} minutes` : ''}
          </p>
        </div>

        <div class="ingredients-list">
          <h2 style="margin-top: 0; font-size: 1.5rem; margin-bottom: 1rem;">Ingredients</h2>
          ${formula.ingredients.map(ingredient => `
            <div class="ingredient-item">
              <span class="ingredient-name">${ingredient.herbName}</span>
              <span class="ingredient-amount">${ingredient.quantity} ${ingredient.unit}</span>
            </div>
          `).join('')}
        </div>

        ${formula.instructions ? `
          <div class="instructions-section">
            <h2 class="instructions-title">Preparation</h2>
            <div style="white-space: pre-wrap; line-height: 1.6;">${formula.instructions}</div>
          </div>
        ` : ''}

        <div style="text-align: center; margin-top: 2rem; color: #6b7280; font-size: 0.875rem;">
          ${formula.creator.name} • Generated ${new Date().toLocaleDateString()}
        </div>
      </body>
      </html>
    `
  }

  /**
   * Generate label format (compact)
   */
  private static generateLabelHTML(formula: FormulaPrintData, options: PrintOptions): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${formula.name} - Label</title>
        <style>
          ${this.getBaseStyles(options.paperSize, options.orientation)}
          .label-container {
            border: 2px solid #374151;
            border-radius: 0.5rem;
            padding: 1rem;
            max-width: 4in;
            margin: 0 auto;
          }
          .label-title {
            font-size: 1.25rem;
            font-weight: bold;
            text-align: center;
            margin-bottom: 0.5rem;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 0.5rem;
          }
          .label-info {
            font-size: 0.875rem;
            margin-bottom: 0.75rem;
          }
          .label-ingredients {
            font-size: 0.75rem;
            background-color: #f9fafb;
            padding: 0.5rem;
            border-radius: 0.25rem;
            margin-bottom: 0.75rem;
          }
          .label-dosage {
            font-weight: 600;
            border: 1px solid #d97706;
            background-color: #fef3c7;
            padding: 0.5rem;
            border-radius: 0.25rem;
            font-size: 0.875rem;
          }
          .label-footer {
            text-align: center;
            font-size: 0.75rem;
            color: #6b7280;
            margin-top: 0.75rem;
            border-top: 1px solid #e5e7eb;
            padding-top: 0.5rem;
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <h1 class="label-title">${formula.name}</h1>
          
          <div class="label-info">
            <strong>Yield:</strong> ${formula.yieldAmount || ''} ${formula.yieldUnit || ''}
            ${formula.preparationTime ? ` • <strong>Prep:</strong> ${formula.preparationTime}min` : ''}
          </div>

          <div class="label-ingredients">
            <strong>Ingredients:</strong><br>
            ${formula.ingredients.map(ing => `${ing.herbName} (${ing.quantity}${ing.unit})`).join(', ')}
          </div>

          ${formula.dosage ? `
            <div class="label-dosage">
              <strong>Dosage:</strong> ${formula.dosage}
              ${formula.duration ? `<br><strong>Duration:</strong> ${formula.duration}` : ''}
            </div>
          ` : ''}

          <div class="label-footer">
            v${formula.version} • ${formula.creator.name}<br>
            ${new Date().toLocaleDateString()}
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Get base CSS styles for print
   */
  private static getBaseStyles(paperSize: string, orientation: string): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Times New Roman', serif;
        font-size: 12pt;
        line-height: 1.5;
        color: #1f2937;
        max-width: ${orientation === 'landscape' ? '10in' : '8.5in'};
        margin: 0 auto;
        padding: 0.75in;
      }
      
      @page {
        size: ${paperSize} ${orientation};
        margin: 0.75in;
      }
      
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        
        .page-break {
          page-break-before: always;
        }
        
        .no-print {
          display: none;
        }
      }
      
      h1, h2, h3, h4, h5, h6 {
        margin-bottom: 0.5rem;
      }
      
      p {
        margin-bottom: 1rem;
      }
      
      table {
        font-size: 0.9em;
      }
    `
  }

  /**
   * Open print dialog with the generated HTML
   */
  static async printFormula(formula: FormulaPrintData, options: PrintOptions): Promise<void> {
    const html = this.generatePrintHTML(formula, options)
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      throw new Error('Unable to open print window. Please check your popup blocker.')
    }

    printWindow.document.write(html)
    printWindow.document.close()

    // Wait for the content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  }

  /**
   * Download as PDF using browser's print to PDF
   */
  static async downloadPDF(formula: FormulaPrintData, options: PrintOptions): Promise<void> {
    const html = this.generatePrintHTML(formula, options)
    
    // Create a new window for PDF generation
    const pdfWindow = window.open('', '_blank')
    if (!pdfWindow) {
      throw new Error('Unable to open PDF window. Please check your popup blocker.')
    }

    pdfWindow.document.write(html)
    pdfWindow.document.close()

    // Wait for content to load, then trigger print dialog
    pdfWindow.onload = () => {
      setTimeout(() => {
        pdfWindow.print()
      }, 250)
    }
  }
}