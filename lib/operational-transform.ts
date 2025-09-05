/**
 * Operational Transform Engine for Real-time Collaboration
 * Implements OT algorithm for conflict-free replicated editing
 */

export interface Operation {
  id: string;
  type: 'insert' | 'delete' | 'replace';
  position: { line: number; column: number };
  content: string;
  userId: string;
  timestamp: number;
  filePath: string;
}

export interface TransformResult {
  operation: Operation;
  transformed: boolean;
}

export class OperationalTransform {
  private operations: Map<string, Operation[]> = new Map();

  /**
   * Apply operational transform to resolve conflicts
   */
  transform(operation: Operation, concurrentOps: Operation[]): TransformResult {
    let transformedOp = { ...operation };
    let wasTransformed = false;

    for (const concurrentOp of concurrentOps) {
      if (this.shouldTransform(operation, concurrentOp)) {
        transformedOp = this.applyTransform(transformedOp, concurrentOp);
        wasTransformed = true;
      }
    }

    return {
      operation: transformedOp,
      transformed: wasTransformed
    };
  }

  /**
   * Check if two operations need transformation
   */
  private shouldTransform(op1: Operation, op2: Operation): boolean {
    // Same file and overlapping positions
    return op1.filePath === op2.filePath &&
           op1.timestamp !== op2.timestamp &&
           this.positionsOverlap(op1, op2);
  }

  /**
   * Check if operations affect overlapping positions
   */
  private positionsOverlap(op1: Operation, op2: Operation): boolean {
    const pos1 = op1.position;
    const pos2 = op2.position;

    if (pos1.line !== pos2.line) return false;

    // For insert operations, check if positions are adjacent or overlapping
    if (op1.type === 'insert' || op2.type === 'insert') {
      return Math.abs(pos1.column - pos2.column) <= 1;
    }

    // For delete/replace, check range overlap
    const end1 = pos1.column + (op1.content?.length || 0);
    const end2 = pos2.column + (op2.content?.length || 0);

    return !(end1 <= pos2.column || end2 <= pos1.column);
  }

  /**
   * Apply transformation rules
   */
  private applyTransform(operation: Operation, concurrentOp: Operation): Operation {
    const transformed = { ...operation };

    // IT (Inclusion Transformation) rules
    if (operation.type === 'insert' && concurrentOp.type === 'insert') {
      // Both inserting at same position
      if (operation.position.line === concurrentOp.position.line &&
          operation.position.column === concurrentOp.position.column) {
        // Tie-break by user ID
        if (operation.userId < concurrentOp.userId) {
          // operation goes first, concurrent shifts right
          transformed.position.column += concurrentOp.content.length;
        }
      }
    }

    if (operation.type === 'insert' && concurrentOp.type === 'delete') {
      // Insert before delete position
      if (operation.position.column <= concurrentOp.position.column) {
        transformed.position.column -= concurrentOp.content.length;
      }
    }

    if (operation.type === 'delete' && concurrentOp.type === 'insert') {
      // Delete after insert position
      if (operation.position.column >= concurrentOp.position.column) {
        transformed.position.column += concurrentOp.content.length;
      }
    }

    return transformed;
  }

  /**
   * Store operation for future transformations
   */
  storeOperation(operation: Operation): void {
    const fileOps = this.operations.get(operation.filePath) || [];
    fileOps.push(operation);

    // Keep only recent operations to prevent memory leaks
    if (fileOps.length > 100) {
      fileOps.shift();
    }

    this.operations.set(operation.filePath, fileOps);
  }

  /**
   * Get concurrent operations for transformation
   */
  getConcurrentOperations(operation: Operation): Operation[] {
    const fileOps = this.operations.get(operation.filePath) || [];
    const recentOps = fileOps.filter(op =>
      Math.abs(op.timestamp - operation.timestamp) < 5000 && // Within 5 seconds
      op.userId !== operation.userId // Not from same user
    );

    return recentOps;
  }

  /**
   * Create operation from editor change
   */
  createOperation(
    type: Operation['type'],
    position: { line: number; column: number },
    content: string,
    userId: string,
    filePath: string
  ): Operation {
    return {
      id: `${userId}-${Date.now()}-${Math.random()}`,
      type,
      position,
      content,
      userId,
      timestamp: Date.now(),
      filePath
    };
  }

  /**
   * Apply operation to text content
   */
  applyOperationToContent(content: string, operation: Operation): string {
    const lines = content.split('\n');
    const line = lines[operation.position.line];

    if (!line) return content;

    let newLine: string;
    const column = operation.position.column;

    switch (operation.type) {
      case 'insert':
        newLine = line.slice(0, column) + operation.content + line.slice(column);
        break;
      case 'delete':
        const deleteLength = operation.content.length;
        newLine = line.slice(0, column) + line.slice(column + deleteLength);
        break;
      case 'replace':
        const replaceLength = operation.content.length;
        newLine = line.slice(0, column) + operation.content + line.slice(column + replaceLength);
        break;
      default:
        return content;
    }

    lines[operation.position.line] = newLine;
    return lines.join('\n');
  }
}