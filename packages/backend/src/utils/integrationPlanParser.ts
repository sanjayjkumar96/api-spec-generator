import { 
  IntegrationPlanSection, 
  ArchitectureDiagram, 
  CodeTemplate, 
  ProjectStructureItem,
  IntegrationPlanOutput 
} from '../models';
import { v4 as uuidv4 } from 'uuid';

export class IntegrationPlanParser {
  
  /**
   * Parse a consolidated integration plan markdown into structured sections
   */
  static parseIntegrationPlan(content: string): IntegrationPlanOutput {
    const sections = this.extractSections(content);
    const diagrams = this.extractDiagrams(content);
    const codeTemplates = this.extractCodeTemplates(content);
    const projectStructure = this.extractProjectStructure(content);
    
    return {
      // Extract main sections
      executiveSummary: this.extractSection(content, /### 1\. Executive Summary and Integration Overview([\s\S]*?)(?=###|---|\n##|$)/i),
      architecture: this.extractSection(content, /### 2\. System Architecture and Component Design([\s\S]*?)(?=###|---|\n##|$)/i),
      apiSpecs: this.extractSection(content, /### 3\. API Specifications and Data Contracts([\s\S]*?)(?=###|---|\n##|$)/i),
      security: this.extractSection(content, /### 4\. Security Architecture and Authentication([\s\S]*?)(?=###|---|\n##|$)/i),
      errorHandling: this.extractSection(content, /### 5\. Error Handling and Resilience Patterns([\s\S]*?)(?=###|---|\n##|$)/i),
      testing: this.extractSection(content, /### 6\. Testing Strategy and Quality Assurance([\s\S]*?)(?=###|---|\n##|$)/i),
      deployment: this.extractSection(content, /### 7\. Deployment and Operations Guide([\s\S]*?)(?=###|---|\n##|$)/i),
      monitoring: this.extractSection(content, /### 8\. Monitoring and Observability([\s\S]*?)(?=###|---|\n##|$)/i),
      performance: this.extractSection(content, /### 9\. Performance and Scalability Considerations([\s\S]*?)(?=###|---|\n##|$)/i),
      risks: this.extractSection(content, /### 10\. Risk Assessment and Mitigation([\s\S]*?)(?=###|---|\n##|$)/i),
      implementation: this.extractSection(content, /### Implementation Guidance([\s\S]*?)(?=---|\n##|$)/i),
      
      // Structured content
      sections,
      diagrams,
      codeTemplates,
      projectStructure,
      
      // Store full content for legacy support
      consolidatedContent: content,
      integrationPlan: this.extractSection(content, /# API Integration Plan([\s\S]*?)(?=---|\n## Architecture Diagrams|$)/i) || content,
    };
  }

  /**
   * Extract all sections from the content
   */
  private static extractSections(content: string): IntegrationPlanSection[] {
    const sections: IntegrationPlanSection[] = [];
    let order = 0;

    // Define section patterns with their types
    const sectionPatterns = [
      { pattern: /### 1\. Executive Summary and Integration Overview([\s\S]*?)(?=###|---|\n##|$)/i, title: 'Executive Summary and Integration Overview', type: 'markdown' as const },
      { pattern: /### 2\. System Architecture and Component Design([\s\S]*?)(?=###|---|\n##|$)/i, title: 'System Architecture and Component Design', type: 'markdown' as const },
      { pattern: /### 3\. API Specifications and Data Contracts([\s\S]*?)(?=###|---|\n##|$)/i, title: 'API Specifications and Data Contracts', type: 'markdown' as const },
      { pattern: /### 4\. Security Architecture and Authentication([\s\S]*?)(?=###|---|\n##|$)/i, title: 'Security Architecture and Authentication', type: 'markdown' as const },
      { pattern: /### 5\. Error Handling and Resilience Patterns([\s\S]*?)(?=###|---|\n##|$)/i, title: 'Error Handling and Resilience Patterns', type: 'markdown' as const },
      { pattern: /### 6\. Testing Strategy and Quality Assurance([\s\S]*?)(?=###|---|\n##|$)/i, title: 'Testing Strategy and Quality Assurance', type: 'markdown' as const },
      { pattern: /### 7\. Deployment and Operations Guide([\s\S]*?)(?=###|---|\n##|$)/i, title: 'Deployment and Operations Guide', type: 'markdown' as const },
      { pattern: /### 8\. Monitoring and Observability([\s\S]*?)(?=###|---|\n##|$)/i, title: 'Monitoring and Observability', type: 'markdown' as const },
      { pattern: /### 9\. Performance and Scalability Considerations([\s\S]*?)(?=###|---|\n##|$)/i, title: 'Performance and Scalability Considerations', type: 'markdown' as const },
      { pattern: /### 10\. Risk Assessment and Mitigation([\s\S]*?)(?=###|---|\n##|$)/i, title: 'Risk Assessment and Mitigation', type: 'markdown' as const },
      { pattern: /### Implementation Guidance([\s\S]*?)(?=---|\n##|$)/i, title: 'Implementation Guidance', type: 'markdown' as const },
    ];

    sectionPatterns.forEach(({ pattern, title, type }) => {
      const match = content.match(pattern);
      if (match && match[1]?.trim()) {
        sections.push({
          id: uuidv4(),
          title,
          content: match[1].trim(),
          type,
          order: order++
        });
      }
    });

    return sections;
  }

  /**
   * Extract architecture diagrams from content
   */
  private static extractDiagrams(content: string): ArchitectureDiagram[] {
    const diagrams: ArchitectureDiagram[] = [];

    // Extract mermaid diagrams
    const mermaidMatches = content.matchAll(/```mermaid\s*([\s\S]*?)```/gi);
    for (const match of mermaidMatches) {
      if (match[1]?.trim()) {
        // Try to determine diagram category from surrounding context
        const beforeContext = content.substring(Math.max(0, match.index! - 200), match.index!);
        const category = this.determineDiagramCategory(beforeContext, match[1]);
        
        diagrams.push({
          id: uuidv4(),
          title: this.extractDiagramTitle(beforeContext) || `${category} Diagram`,
          content: match[1].trim(),
          type: 'mermaid',
          category
        });
      }
    }

    // Extract ASCII diagrams (text-based diagrams)
    const asciiMatches = content.matchAll(/```\s*\n([\s\S]*?(?:┌|┐|┘|└|│|─|├|┤|┬|┴|┼)[\s\S]*?)```/gi);
    for (const match of asciiMatches) {
      if (match[1]?.trim()) {
        const beforeContext = content.substring(Math.max(0, match.index! - 200), match.index!);
        diagrams.push({
          id: uuidv4(),
          title: this.extractDiagramTitle(beforeContext) || 'Architecture Diagram',
          content: match[1].trim(),
          type: 'ascii',
          category: 'component'
        });
      }
    }

    return diagrams;
  }

  /**
   * Extract code templates from content
   */
  private static extractCodeTemplates(content: string): CodeTemplate[] {
    const templates: CodeTemplate[] = [];

    // Extract code blocks with language specification
    const codeMatches = content.matchAll(/```(\w+)\s*([\s\S]*?)```/gi);
    for (const match of codeMatches) {
      const language = match[1].toLowerCase();
      const code = match[2]?.trim();
      
      if (code && language !== 'mermaid' && !this.isAsciiDiagram(code)) {
        const beforeContext = content.substring(Math.max(0, match.index! - 200), match.index!);
        const category = this.determineCodeCategory(beforeContext, code);
        const framework = this.determineFramework(code, language);
        
        templates.push({
          id: uuidv4(),
          title: this.extractCodeTitle(beforeContext) || `${language} ${category}`,
          content: code,
          language,
          category,
          framework
        });
      }
    }

    return templates;
  }

  /**
   * Extract project structure from content
   */
  private static extractProjectStructure(content: string): ProjectStructureItem[] {
    const structure: ProjectStructureItem[] = [];

    // Extract project structure from markdown code blocks or text
    const structureMatches = content.matchAll(/```(?:bash|text|)?\s*([\s\S]*?(?:├──|└──|│)[\s\S]*?)```/gi);
    for (const match of structureMatches) {
      const structureText = match[1]?.trim();
      if (structureText) {
        const items = this.parseProjectStructureText(structureText);
        structure.push(...items);
      }
    }

    return structure;
  }

  /**
   * Helper method to extract a section by regex pattern
   */
  private static extractSection(content: string, pattern: RegExp): string | undefined {
    const match = content.match(pattern);
    return match?.[1]?.trim();
  }

  /**
   * Determine diagram category from context
   */
  private static determineDiagramCategory(context: string, diagramContent: string): ArchitectureDiagram['category'] {
    const contextLower = context.toLowerCase();
    const contentLower = diagramContent.toLowerCase();
    
    if (contextLower.includes('high-level') || contextLower.includes('system architecture')) {
      return 'high-level';
    }
    if (contextLower.includes('low-level') || contextLower.includes('detailed') || contentLower.includes('sequencediagram')) {
      return 'low-level';
    }
    if (contextLower.includes('data flow') || contextLower.includes('dataflow')) {
      return 'data-flow';
    }
    if (contextLower.includes('deployment') || contextLower.includes('infrastructure')) {
      return 'deployment';
    }
    if (contextLower.includes('security') || contextLower.includes('auth')) {
      return 'security';
    }
    
    return 'component';
  }

  /**
   * Extract diagram title from context
   */
  private static extractDiagramTitle(context: string): string | null {
    const titleMatch = context.match(/###?\s*(.+?)(?:\n|$)/);
    return titleMatch?.[1]?.trim() || null;
  }

  /**
   * Determine code category from context and content
   */
  private static determineCodeCategory(context: string, code: string): CodeTemplate['category'] {
    const contextLower = context.toLowerCase();
    const codeLower = code.toLowerCase();
    
    if (contextLower.includes('interface') || codeLower.includes('interface ') || codeLower.includes('export interface')) {
      return 'interface';
    }
    if (contextLower.includes('dto') || codeLower.includes('dto')) {
      return 'dto';
    }
    if (contextLower.includes('service') || codeLower.includes('service')) {
      return 'service';
    }
    if (contextLower.includes('controller') || codeLower.includes('controller')) {
      return 'controller';
    }
    if (contextLower.includes('model') || codeLower.includes('model')) {
      return 'model';
    }
    if (contextLower.includes('config') || codeLower.includes('config')) {
      return 'config';
    }
    if (contextLower.includes('test') || codeLower.includes('test') || codeLower.includes('spec')) {
      return 'test';
    }
    if (contextLower.includes('schema') || codeLower.includes('create table') || codeLower.includes('schema')) {
      return 'schema';
    }
    
    return 'interface';
  }

  /**
   * Determine framework from code content
   */
  private static determineFramework(code: string, language: string): string | undefined {
    const codeLower = code.toLowerCase();
    
    if (language === 'typescript' || language === 'javascript') {
      if (codeLower.includes('react') || codeLower.includes('jsx') || codeLower.includes('usestate')) {
        return 'React';
      }
      if (codeLower.includes('express') || codeLower.includes('app.get') || codeLower.includes('req, res')) {
        return 'Express';
      }
      if (codeLower.includes('nestjs') || codeLower.includes('@controller') || codeLower.includes('@injectable')) {
        return 'NestJS';
      }
    }
    
    return undefined;
  }

  /**
   * Extract code title from context
   */
  private static extractCodeTitle(context: string): string | null {
    const titleMatch = context.match(/###?\s*(.+?)(?:\n|$)/);
    return titleMatch?.[1]?.trim() || null;
  }

  /**
   * Check if content is an ASCII diagram
   */
  private static isAsciiDiagram(content: string): boolean {
    return /[┌┐┘└│─├┤┬┴┼]/.test(content);
  }

  /**
   * Parse project structure text into items
   */
  private static parseProjectStructureText(text: string): ProjectStructureItem[] {
    const items: ProjectStructureItem[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Extract path from tree structure
      const pathMatch = trimmed.match(/[├└│─\s]*(.+?)(?:\s*\/)?$/);
      if (pathMatch) {
        const path = pathMatch[1].trim();
        if (path && !path.match(/^[├└│─\s]+$/)) {
          const isDirectory = line.endsWith('/') || !path.includes('.');
          items.push({
            path,
            type: isDirectory ? 'directory' : 'file',
            description: this.extractPathDescription(line)
          });
        }
      }
    }
    
    return items;
  }

  /**
   * Extract description for a path from comments
   */
  private static extractPathDescription(line: string): string | undefined {
    const commentMatch = line.match(/\/\/\s*(.+)/);
    return commentMatch?.[1]?.trim();
  }
}