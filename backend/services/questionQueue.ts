import { Question, QuestionQueueItem } from "../../types";

export class QuestionQueue {
  private queue: QuestionQueueItem[] = [];

  constructor(questions: Question[], completedIds: string[]) {
    this.queue = questions.map(q => ({
      question: q,
      status: completedIds.includes(q.id) ? 'completed' : 'pending'
    }));
  }

  getQueue(): QuestionQueueItem[] {
    return this.queue;
  }

  getNextQuestion(): Question | null {
    const next = this.queue.find(item => item.status === 'pending');
    if (next) {
      next.status = 'active';
      next.startedAt = Date.now();
      return next.question;
    }
    return null;
  }

  markComplete(questionId: string, timeSpent: number): void {
    const item = this.queue.find(q => q.question.id === questionId);
    if (item) {
      item.status = 'completed';
      item.completedAt = Date.now();
      item.timeSpentSec = timeSpent;
    }
  }

  skipQuestion(questionId: string): void {
    const item = this.queue.find(q => q.question.id === questionId);
    if (item) {
      item.status = 'skipped';
      item.completedAt = Date.now();
    }
  }

  getProgress(): { completed: number; skipped: number; remaining: number; total: number } {
    const total = this.queue.length;
    const completed = this.queue.filter(q => q.status === 'completed').length;
    const skipped = this.queue.filter(q => q.status === 'skipped').length;
    const remaining = total - completed - skipped;
    return { completed, skipped, remaining, total };
  }

  reorderForDifficulty(targetDifficulty: number): void {
    const pendingItems = this.queue.filter(item => item.status === 'pending');
    const nonPendingItems = this.queue.filter(item => item.status !== 'pending');

    pendingItems.sort((a, b) => {
      const diffA = Math.abs(a.question.difficulty - targetDifficulty);
      const diffB = Math.abs(b.question.difficulty - targetDifficulty);
      return diffA - diffB;
    });

    this.queue = [...nonPendingItems, ...pendingItems];
  }
}
