import { 
  IntegrationPlanSection, 
  ArchitectureDiagram, 
  CodeTemplate, 
  ProjectStructureItem,
  IntegrationPlanOutput 
} from '../models';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

export class IntegrationPlanParser {
  
  /**
   * Parse a consolidated integration plan markdown into structured sections
   */
  static parseIntegrationPlan(content: string): IntegrationPlanOutput {
    logger.info('Starting integration plan parsing', { 
      contentLength: content.length,
      contentPreview: content.substring(0, 500) 
    });

    const sections = this.extractSections(content);
    const diagrams = this.extractDiagrams(content);
    const codeTemplates = this.extractCodeTemplates(content);
    const projectStructure = this.extractProjectStructure(content);
    
    logger.info('Integration plan parsing results', {
      sectionsCount: sections.length,
      diagramsCount: diagrams.length,
      codeTemplatesCount: codeTemplates.length,
      projectStructureCount: projectStructure.length
    });

    return {
      // Extract main sections with more flexible patterns
      executiveSummary: this.extractSection(content, [
        /### 1\. Executive Summary and Integration Overview([\s\S]*?)(?=###|---|\n##|$)/i,
        /## Executive Summary([\s\S]*?)(?=###?|---|\n##|$)/i,
        /# Executive Summary([\s\S]*?)(?=###?|---|\n##|$)/i,
        /### Executive Summary([\s\S]*?)(?=###|---|\n##|$)/i
      ]),
      architecture: this.extractSection(content, [
        /### 2\. System Architecture and Component Design([\s\S]*?)(?=###|---|\n##|$)/i,
        /## Architecture([\s\S]*?)(?=###?|---|\n##|$)/i,
        /## System Architecture([\s\S]*?)(?=###?|---|\n##|$)/i,
        /### Architecture([\s\S]*?)(?=###|---|\n##|$)/i
      ]),
      apiSpecs: this.extractSection(content, [
        /### 3\. API Specifications and Data Contracts([\s\S]*?)(?=###|---|\n##|$)/i,
        /## API Specifications([\s\S]*?)(?=###?|---|\n##|$)/i,
        /### API Specifications([\s\S]*?)(?=###|---|\n##|$)/i
      ]),
      security: this.extractSection(content, [
        /### 4\. Security Architecture and Authentication([\s\S]*?)(?=###|---|\n##|$)/i,
        /## Security([\s\S]*?)(?=###?|---|\n##|$)/i,
        /### Security([\s\S]*?)(?=###|---|\n##|$)/i
      ]),
      errorHandling: this.extractSection(content, [
        /### 5\. Error Handling and Resilience Patterns([\s\S]*?)(?=###|---|\n##|$)/i,
        /## Error Handling([\s\S]*?)(?=###?|---|\n##|$)/i,
        /### Error Handling([\s\S]*?)(?=###|---|\n##|$)/i
      ]),
      testing: this.extractSection(content, [
        /### 6\. Testing Strategy and Quality Assurance([\s\S]*?)(?=###|---|\n##|$)/i,
        /## Testing([\s\S]*?)(?=###?|---|\n##|$)/i,
        /### Testing([\s\S]*?)(?=###|---|\n##|$)/i
      ]),
      deployment: this.extractSection(content, [
        /### 7\. Deployment and Operations Guide([\s\S]*?)(?=###|---|\n##|$)/i,
        /## Deployment([\s\S]*?)(?=###?|---|\n##|$)/i,
        /### Deployment([\s\S]*?)(?=###|---|\n##|$)/i
      ]),
      monitoring: this.extractSection(content, [
        /### 8\. Monitoring and Observability([\s\S]*?)(?=###|---|\n##|$)/i,
        /## Monitoring([\s\S]*?)(?=###?|---|\n##|$)/i,
        /### Monitoring([\s\S]*?)(?=###|---|\n##|$)/i
      ]),
      performance: this.extractSection(content, [
        /### 9\. Performance and Scalability Considerations([\s\S]*?)(?=###|---|\n##|$)/i,
        /## Performance([\s\S]*?)(?=###?|---|\n##|$)/i,
        /### Performance([\s\S]*?)(?=###|---|\n##|$)/i
      ]),
      risks: this.extractSection(content, [
        /### 10\. Risk Assessment and Mitigation([\s\S]*?)(?=###|---|\n##|$)/i,
        /## Risk Assessment([\s\S]*?)(?=###?|---|\n##|$)/i,
        /### Risk Assessment([\s\S]*?)(?=###|---|\n##|$)/i,
        /## Risks([\s\S]*?)(?=###?|---|\n##|$)/i
      ]),
      implementation: this.extractSection(content, [
        /### Implementation Guidance([\s\S]*?)(?=---|\n##|$)/i,
        /## Implementation([\s\S]*?)(?=###?|---|\n##|$)/i,
        /### Implementation([\s\S]*?)(?=---|\n##|$)/i
      ]),
      
      // Structured content
      sections,
      diagrams,
      codeTemplates,
      projectStructure,
      
      // Store full content for legacy support
      consolidatedContent: content,
      integrationPlan: this.extractSection(content, [
        /# API Integration Plan([\s\S]*?)(?=---|\n## Architecture Diagrams|$)/i,
        /# Integration Plan([\s\S]*?)(?=---|\n## |$)/i
      ]) || content,
    };
  }

  /**
   * Extract all sections from the content with flexible patterns
   */
  private static extractSections(content: string): IntegrationPlanSection[] {
    const sections: IntegrationPlanSection[] = [];
    let order = 0;

    // Define section patterns with multiple variations
    const sectionPatterns = [
      { 
        patterns: [
          /### 1\. Executive Summary and Integration Overview([\s\S]*?)(?=###|---|\n##|$)/i,
          /## Executive Summary([\s\S]*?)(?=###?|---|\n##|$)/i,
          /### Executive Summary([\s\S]*?)(?=###|---|\n##|$)/i
        ], 
        title: 'Executive Summary and Integration Overview', 
        type: 'markdown' as const 
      },
      { 
        patterns: [
          /### 2\. System Architecture and Component Design([\s\S]*?)(?=###|---|\n##|$)/i,
          /## Architecture([\s\S]*?)(?=###?|---|\n##|$)/i,
          /## System Architecture([\s\S]*?)(?=###?|---|\n##|$)/i
        ], 
        title: 'System Architecture and Component Design', 
        type: 'markdown' as const 
      },
      { 
        patterns: [
          /### 3\. API Specifications and Data Contracts([\s\S]*?)(?=###|---|\n##|$)/i,
          /## API Specifications([\s\S]*?)(?=###?|---|\n##|$)/i
        ], 
        title: 'API Specifications and Data Contracts', 
        type: 'markdown' as const 
      },
      { 
        patterns: [
          /### 4\. Security Architecture and Authentication([\s\S]*?)(?=###|---|\n##|$)/i,
          /## Security([\s\S]*?)(?=###?|---|\n##|$)/i
        ], 
        title: 'Security Architecture and Authentication', 
        type: 'markdown' as const 
      },
      { 
        patterns: [
          /### 5\. Error Handling and Resilience Patterns([\s\S]*?)(?=###|---|\n##|$)/i,
          /## Error Handling([\s\S]*?)(?=###?|---|\n##|$)/i
        ], 
        title: 'Error Handling and Resilience Patterns', 
        type: 'markdown' as const 
      },
      { 
        patterns: [
          /### 6\. Testing Strategy and Quality Assurance([\s\S]*?)(?=###|---|\n##|$)/i,
          /## Testing([\s\S]*?)(?=###?|---|\n##|$)/i
        ], 
        title: 'Testing Strategy and Quality Assurance', 
        type: 'markdown' as const 
      },
      { 
        patterns: [
          /### 7\. Deployment and Operations Guide([\s\S]*?)(?=###|---|\n##|$)/i,
          /## Deployment([\s\S]*?)(?=###?|---|\n##|$)/i
        ], 
        title: 'Deployment and Operations Guide', 
        type: 'markdown' as const 
      },
      { 
        patterns: [
          /### 8\. Monitoring and Observability([\s\S]*?)(?=###|---|\n##|$)/i,
          /## Monitoring([\s\S]*?)(?=###?|---|\n##|$)/i
        ], 
        title: 'Monitoring and Observability', 
        type: 'markdown' as const 
      },
      { 
        patterns: [
          /### 9\. Performance and Scalability Considerations([\s\S]*?)(?=###|---|\n##|$)/i,
          /## Performance([\s\S]*?)(?=###?|---|\n##|$)/i
        ], 
        title: 'Performance and Scalability Considerations', 
        type: 'markdown' as const 
      },
      { 
        patterns: [
          /### 10\. Risk Assessment and Mitigation([\s\S]*?)(?=###|---|\n##|$)/i,
          /## Risk Assessment([\s\S]*?)(?=###?|---|\n##|$)/i,
          /## Risks([\s\S]*?)(?=###?|---|\n##|$)/i
        ], 
        title: 'Risk Assessment and Mitigation', 
        type: 'markdown' as const 
      },
      { 
        patterns: [
          /### Implementation Guidance([\s\S]*?)(?=---|\n##|$)/i,
          /## Implementation([\s\S]*?)(?=###?|---|\n##|$)/i
        ], 
        title: 'Implementation Guidance', 
        type: 'markdown' as const 
      },
    ];

    sectionPatterns.forEach(({ patterns, title, type }) => {
      let matchFound = false;
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1]?.trim()) {
          sections.push({
            id: uuidv4(),
            title,
            content: match[1].trim(),
            type,
            order: order++
          });
          matchFound = true;
          break;
        }
      }
      
      if (!matchFound) {
        logger.debug(`No match found for section: `,title);
      }
    });

    return sections;
  }

  /**
   * Extract architecture diagrams from content
   */
  private static extractDiagrams(content: string): ArchitectureDiagram[] {
    const diagrams: ArchitectureDiagram[] = [];

    // Extract mermaid diagrams with more flexible patterns
    const mermaidMatches = content.matchAll(/```mermaid\s*([\s\S]*?)```/gi);
    for (const match of mermaidMatches) {
      if (match[1]?.trim()) {
        // Try to determine diagram category from surrounding context
        const beforeContext = content.substring(Math.max(0, match.index! - 300), match.index!);
        const afterContext = content.substring(match.index! + match[0].length, Math.min(content.length, match.index! + match[0].length + 200));
        const category = this.determineDiagramCategory(beforeContext + afterContext, match[1]);
        
        diagrams.push({
          id: uuidv4(),
          title: this.extractDiagramTitle(beforeContext) || `${category} Architecture Diagram`,
          content: match[1].trim(),
          type: 'mermaid',
          category
        });
      }
    }

    // Extract ASCII diagrams (text-based diagrams) with better patterns
    const asciiMatches = content.matchAll(/```(?:text|ascii|)?\s*\n([\s\S]*?(?:┌|┐|┘|└|│|─|├|┤|┬|┴|┼|╔|╗|╚|╝|║|═|╠|╣|╦|╩|╬)[\s\S]*?)```/gi);
    for (const match of asciiMatches) {
      if (match[1]?.trim()) {
        const beforeContext = content.substring(Math.max(0, match.index! - 300), match.index!);
        diagrams.push({
          id: uuidv4(),
          title: this.extractDiagramTitle(beforeContext) || 'System Architecture Diagram',
          content: match[1].trim(),
          type: 'ascii',
          category: 'component'
        });
      }
    }

    // Also look for diagram-like content in plain text blocks that might be formatted as architecture
    const plainArchMatches = content.matchAll(/```\s*\n([\s\S]*?(?:Frontend|Backend|Database|API|Service|Component|Architecture)[\s\S]*?)```/gi);
    for (const match of plainArchMatches) {
      const diagramContent = match[1]?.trim();
      if (diagramContent && !this.isCodeContent(diagramContent) && this.looksLikeArchitectureDiagram(diagramContent)) {
        const beforeContext = content.substring(Math.max(0, match.index! - 300), match.index!);
        diagrams.push({
          id: uuidv4(),
          title: this.extractDiagramTitle(beforeContext) || 'Architecture Overview',
          content: diagramContent,
          type: 'text',
          category: 'high-level'
        });
      }
    }

    logger.info('Extracted diagrams', { 
      count: diagrams.length,
      types: diagrams.map(d => ({ type: d.type, category: d.category, title: d.title }))
    });

    return diagrams;
  }

  /**
   * Extract code templates from content with improved detection
   */
  private static extractCodeTemplates(content: string): CodeTemplate[] {
    const templates: CodeTemplate[] = [];

    // Extract code blocks with language specification
    const codeMatches = content.matchAll(/```(\w+)\s*([\s\S]*?)```/gi);
    for (const match of codeMatches) {
      const language = match[1].toLowerCase();
      const code = match[2]?.trim();
      
      // Skip non-code languages and empty content
      if (!code || language === 'mermaid' || this.isAsciiDiagram(code) || this.isPlainText(language)) {
        continue;
      }
      
      const beforeContext = content.substring(Math.max(0, match.index! - 400), match.index!);
      const afterContext = content.substring(match.index! + match[0].length, Math.min(content.length, match.index! + match[0].length + 200));
      const fullContext = beforeContext + afterContext;
      
      const category = this.determineCodeCategory(fullContext, code);
      const framework = this.determineFramework(code, language);
      const title = this.extractCodeTitle(beforeContext) || this.generateCodeTitle(language, category, code);
      
      templates.push({
        id: uuidv4(),
        title,
        content: code,
        language,
        category,
        framework
      });
    }

    // Also extract YAML/HCL configuration files
    const configMatches = content.matchAll(/```(yaml|yml|hcl|tf|dockerfile)\s*([\s\S]*?)```/gi);
    for (const match of configMatches) {
      const language = match[1].toLowerCase();
      const code = match[2]?.trim();
      
      if (code) {
        const beforeContext = content.substring(Math.max(0, match.index! - 400), match.index!);
        const category = this.determineConfigCategory(beforeContext, code);
        const title = this.extractCodeTitle(beforeContext) || this.generateConfigTitle(language, category);
        
        templates.push({
          id: uuidv4(),
          title,
          content: code,
          language,
          category,
          framework: this.determineConfigFramework(code, language)
        });
      }
    }

    logger.info('Extracted code templates', { 
      count: templates.length,
      languages: templates.map(t => ({ language: t.language, category: t.category, title: t.title }))
    });

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
   * Helper method to extract a section by trying multiple regex patterns
   */
  private static extractSection(content: string, patterns: RegExp[]): string | undefined {
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match?.[1]?.trim()) {
        return match[1].trim();
      }
    }
    return undefined;
  }

  /**
   * Check if content looks like an architecture diagram
   */
  private static looksLikeArchitectureDiagram(content: string): boolean {
    const architectureKeywords = [
      'frontend', 'backend', 'database', 'api', 'service', 'component',
      'architecture', 'system', 'flow', 'diagram', 'structure', 'layer',
      'client', 'server', 'gateway', 'load balancer', 'microservice'
    ];
    
    const contentLower = content.toLowerCase();
    const keywordCount = architectureKeywords.filter(keyword => contentLower.includes(keyword)).length;
    
    // If it has multiple architecture keywords and structural indicators, it's likely a diagram
    return keywordCount >= 2 && (
      content.includes('->') || 
      content.includes('-->') || 
      content.includes('├') || 
      content.includes('└') ||
      content.includes('│') ||
      content.includes('◄') ||
      content.includes('►') ||
      /\s+[\w\s]+\s+[-=]+>\s+[\w\s]+/i.test(content)
    );
  }

  /**
   * Check if content is code rather than diagram
   */
  private static isCodeContent(content: string): boolean {
    const codeIndicators = [
      'function', 'class', 'interface', 'import', 'export', 'const', 'let', 'var',
      'async', 'await', 'return', 'if', 'else', 'for', 'while', 'try', 'catch',
      'public', 'private', 'protected', '{', '}', ';', '//', '/*', '*/'
    ];
    
    const contentLower = content.toLowerCase();
    const codeKeywordCount = codeIndicators.filter(keyword => contentLower.includes(keyword)).length;
    
    return codeKeywordCount >= 3;
  }

  /**
   * Check if language is plain text
   */
  private static isPlainText(language: string): boolean {
    const textLanguages = ['text', 'txt', 'md', 'markdown', 'ascii'];
    return textLanguages.includes(language.toLowerCase());
  }

  /**
   * Generate a code title based on language and category
   */
  private static generateCodeTitle(language: string, category: string, code: string): string {
    // Try to extract class/interface/function name
    const classMatch = code.match(/(?:export\s+)?(?:class|interface)\s+(\w+)/i);
    if (classMatch) {
      return `${classMatch[1]} ${category}`;
    }
    
    const functionMatch = code.match(/(?:export\s+)?(?:function|const)\s+(\w+)/i);
    if (functionMatch) {
      return `${functionMatch[1]} Function`;
    }
    
    return `${language.charAt(0).toUpperCase() + language.slice(1)} ${category}`;
  }

  /**
   * Determine configuration category
   */
  private static determineConfigCategory(context: string, code: string): CodeTemplate['category'] {
    const contextLower = context.toLowerCase();
    const codeLower = code.toLowerCase();
    
    if (contextLower.includes('docker') || codeLower.includes('from ') || codeLower.includes('dockerfile')) {
      return 'config';
    }
    if (contextLower.includes('kubernetes') || contextLower.includes('k8s') || codeLower.includes('apiversion')) {
      return 'config';
    }
    if (contextLower.includes('terraform') || codeLower.includes('resource ') || codeLower.includes('provider ')) {
      return 'config';
    }
    if (contextLower.includes('serverless') || codeLower.includes('service:') || codeLower.includes('functions:')) {
      return 'config';
    }
    
    return 'config';
  }

  /**
   * Generate configuration title
   */
  private static generateConfigTitle(language: string, category: string): string {
    switch (language) {
      case 'dockerfile':
        return 'Docker Configuration';
      case 'yaml':
      case 'yml':
        return 'YAML Configuration';
      case 'hcl':
      case 'tf':
        return 'Terraform Configuration';
      default:
        return `${language.toUpperCase()} Configuration`;
    }
  }

  /**
   * Determine configuration framework
   */
  private static determineConfigFramework(code: string, language: string): string | undefined {
    const codeLower = code.toLowerCase();
    
    if (language === 'dockerfile' || codeLower.includes('from ')) {
      return 'Docker';
    }
    if (codeLower.includes('apiversion:') && codeLower.includes('kind:')) {
      return 'Kubernetes';
    }
    if (codeLower.includes('resource ') && codeLower.includes('provider ')) {
      return 'Terraform';
    }
    if (codeLower.includes('service:') && codeLower.includes('functions:')) {
      return 'Serverless Framework';
    }
    
    return undefined;
  }

  /**
   * Determine diagram category from context with improved detection
   */
  private static determineDiagramCategory(context: string, diagramContent: string): ArchitectureDiagram['category'] {
    const contextLower = context.toLowerCase();
    const contentLower = diagramContent.toLowerCase();
    
    if (contextLower.includes('high-level') || contextLower.includes('system architecture') || contextLower.includes('overview')) {
      return 'high-level';
    }
    if (contextLower.includes('sequence') || contentLower.includes('sequencediagram') || contentLower.includes('participant')) {
      return 'low-level';
    }
    if (contextLower.includes('data flow') || contextLower.includes('dataflow') || contextLower.includes('flow')) {
      return 'data-flow';
    }
    if (contextLower.includes('deployment') || contextLower.includes('infrastructure') || contextLower.includes('pipeline')) {
      return 'deployment';
    }
    if (contextLower.includes('security') || contextLower.includes('auth') || contextLower.includes('authentication')) {
      return 'security';
    }
    if (contextLower.includes('low-level') || contextLower.includes('detailed') || contextLower.includes('component')) {
      return 'low-level';
    }
    
    return 'component';
  }

  /**
   * Extract diagram title from context with improved patterns
   */
  private static extractDiagramTitle(context: string): string | null {
    // Look for various title patterns
    const patterns = [
      /###\s*(.+?)(?:\n|$)/,
      /##\s*(.+?)(?:\n|$)/,
      /#\s*(.+?)(?:\n|$)/,
      /\*\*(.+?)\*\*/,
      /\*(.+?)\*/
    ];
    
    for (const pattern of patterns) {
      const match = context.match(pattern);
      if (match?.[1]?.trim()) {
        const title = match[1].trim();
        // Filter out generic titles
        if (!title.toLowerCase().includes('code') && title.length > 3) {
          return title;
        }
      }
    }
    
    return null;
  }

  /**
   * Determine code category from context and content with improved detection
   */
  private static determineCodeCategory(context: string, code: string): CodeTemplate['category'] {
    const contextLower = context.toLowerCase();
    const codeLower = code.toLowerCase();
    
    if (contextLower.includes('interface') || codeLower.includes('interface ') || codeLower.includes('export interface')) {
      return 'interface';
    }
    if (contextLower.includes('dto') || contextLower.includes('data transfer') || codeLower.includes('dto')) {
      return 'dto';
    }
    if (contextLower.includes('service') || codeLower.includes('service') || codeLower.includes('business logic')) {
      return 'service';
    }
    if (contextLower.includes('controller') || codeLower.includes('controller') || codeLower.includes('handler')) {
      return 'controller';
    }
    if (contextLower.includes('model') || codeLower.includes('model') || codeLower.includes('entity')) {
      return 'model';
    }
    if (contextLower.includes('config') || contextLower.includes('configuration') || codeLower.includes('config')) {
      return 'config';
    }
    if (contextLower.includes('test') || contextLower.includes('spec') || codeLower.includes('test') || codeLower.includes('describe(')) {
      return 'test';
    }
    if (contextLower.includes('schema') || contextLower.includes('database') || codeLower.includes('create table') || codeLower.includes('schema')) {
      return 'schema';
    }
    if (contextLower.includes('middleware') || codeLower.includes('middleware') || codeLower.includes('next()')) {
      return 'service';
    }
    if (contextLower.includes('component') || codeLower.includes('react') || codeLower.includes('jsx')) {
      return 'interface';
    }
    
    return 'interface';
  }

  /**
   * Extract code title from context
   */
  private static extractCodeTitle(context: string): string | null {
    // Look for various title patterns before code blocks
    const patterns = [
      /###\s*(.+?)(?:\n|$)/,
      /##\s*(.+?)(?:\n|$)/,
      /#\s*(.+?)(?:\n|$)/,
      /\*\*(.+?)\*\*/,
      /\/\/\s*(.+?)(?:\n|$)/,
      /\/\*\s*(.+?)\s*\*\//
    ];
    
    for (const pattern of patterns) {
      const match = context.match(pattern);
      if (match?.[1]?.trim()) {
        const title = match[1].trim();
        // Filter out very long or very short titles
        if (title.length > 3 && title.length < 100) {
          return title;
        }
      }
    }
    
    return null;
  }

  /**
   * Determine framework from code content
   */
  private static determineFramework(code: string, language: string): string | undefined {
    const codeLower = code.toLowerCase();
    
    // JavaScript/TypeScript frameworks
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
      if (codeLower.includes('fastify')) {
        return 'Fastify';
      }
      if (codeLower.includes('next') || codeLower.includes('getstaticprops')) {
        return 'Next.js';
      }
      if (codeLower.includes('vue') || codeLower.includes('v-model')) {
        return 'Vue';
      }
      if (codeLower.includes('angular') || codeLower.includes('@component')) {
        return 'Angular';
      }
    }
    
    // Other languages
    if (language === 'python') {
      if (codeLower.includes('django') || codeLower.includes('models.model')) {
        return 'Django';
      }
      if (codeLower.includes('flask') || codeLower.includes('app.route')) {
        return 'Flask';
      }
      if (codeLower.includes('fastapi') || codeLower.includes('@app.get')) {
        return 'FastAPI';
      }
    }
    
    if (language === 'java') {
      if (codeLower.includes('spring') || codeLower.includes('@restcontroller') || codeLower.includes('@service')) {
        return 'Spring Boot';
      }
    }
    
    if (language === 'csharp' || language === 'cs') {
      if (codeLower.includes('asp.net') || codeLower.includes('[apicontroller]')) {
        return 'ASP.NET Core';
      }
    }
    
    return undefined;
  }

  /**
   * Check if content is an ASCII diagram
   */
  private static isAsciiDiagram(content: string): boolean {
    const asciiChars = ['┌', '┐', '┘', '└', '│', '─', '├', '┤', '┬', '┴', '┼', '╔', '╗', '╚', '╝', '║', '═', '╠', '╣', '╦', '╩', '╬'];
    return asciiChars.some(char => content.includes(char));
  }

  /**
   * Parse project structure text into structured items
   */
  private static parseProjectStructureText(structureText: string): ProjectStructureItem[] {
    const items: ProjectStructureItem[] = [];
    const lines = structureText.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;
      
      // Extract path and determine type
      let path = '';
      let type: 'file' | 'directory' = 'file';
      let description = '';
      
      // Handle different tree formats
      if (trimmedLine.includes('├──') || trimmedLine.includes('└──')) {
        path = trimmedLine.replace(/[├└─│\s]/g, '').split('#')[0].trim();
        if (trimmedLine.includes('#')) {
          description = trimmedLine.split('#')[1].trim();
        }
      } else if (trimmedLine.includes('/')) {
        // Handle simple path format
        const parts = trimmedLine.split(/\s+/);
        path = parts[0];
        if (parts.length > 1) {
          description = parts.slice(1).join(' ');
        }
      } else {
        path = trimmedLine;
      }
      
      // Determine if it's a directory
      if (path.endsWith('/') || path.includes('/') && !path.includes('.') || 
          description.toLowerCase().includes('directory') || 
          description.toLowerCase().includes('folder')) {
        type = 'directory';
        path = path.replace(/\/$/, ''); // Remove trailing slash
      }
      
      if (path) {
        items.push({
          path,
          type,
          description: description || undefined
        });
      }
    }
    
    return items;
  }
}