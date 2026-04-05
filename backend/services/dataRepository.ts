import { DB } from "./db";
import { InterviewSession, FeedbackEntry, TranscriptEntry } from "../../types";

export const DataRepository = {
  async getUserStats(userId: string) {
    const sessions = await DB.getSessions();
    const userSessions = sessions; // In current db structure returning for the user intrinsically or passed context

    const completedSessions = userSessions.filter(s => s.status === 'finished' || s.status === 'round1_complete');
    const totalInterviews = userSessions.length;
    const totalQuestions = userSessions.reduce((acc, s) => acc + (s.questionsAnswered || 0), 0);
    
    const domains = new Set(userSessions.map(s => s.domain));
    const activeDomainsCount = domains.size;

    let avgScore = 0;
    const domainScores: Record<string, { total: number, count: number }> = {};

    completedSessions.forEach(s => {
      if (s.round1.scores && s.round1.scores.length > 0) {
        const sessionAvg = s.round1.scores.reduce((acc, score) => acc + score.aggregateScore, 0) / s.round1.scores.length;
        if (!domainScores[s.domain]) domainScores[s.domain] = { total: 0, count: 0 };
        domainScores[s.domain].total += sessionAvg;
        domainScores[s.domain].count += 1;
      }
    });

    let overallTotal = 0;
    let overallCount = 0;
    let bestDomain = "N/A";
    let worstDomain = "N/A";
    let bestScore = -1;
    let worstScore = 101;

    Object.keys(domainScores).forEach(domain => {
      const avg = domainScores[domain].total / domainScores[domain].count;
      overallTotal += avg;
      overallCount += 1;

      if (avg > bestScore) { bestScore = avg; bestDomain = domain; }
      if (avg < worstScore) { worstScore = avg; worstDomain = domain; }
    });

    if (overallCount > 0) avgScore = overallTotal / overallCount;

    return {
      totalInterviews,
      avgScore,
      domainsCount: activeDomainsCount,
      totalQuestions,
      bestDomain,
      worstDomain
    };
  },

  async getSessionHistory(userId: string) {
    const sessions = await DB.getSessions();
    return sessions.map(s => {
      let score = 0;
      if (s.round1.scores && s.round1.scores.length > 0) {
        score = s.round1.scores.reduce((acc, sc) => acc + sc.aggregateScore, 0) / s.round1.scores.length;
      }
      return {
        sessionId: s.sessionId,
        domain: s.domain,
        difficulty: s.difficulty,
        date: s.startedAt,
        score,
        status: s.status,
        questionCount: s.questionsAnswered || 0
      };
    });
  },

  async getSessionDetail(sessionId: string) {
    const sessions = await DB.getSessions();
    const session = sessions.find(s => s.sessionId === sessionId);
    const transcripts = await DB.getTranscripts(sessionId);
    const feedbackEntries = session?.round1?.feedbackEntries || await DB.getFeedbackEntries(sessionId);
    
    return { session, transcripts, feedbackEntries };
  },

  async getScoresByDomain(userId: string) {
    const sessions = await DB.getSessions();
    const domainData: Record<string, { tScore: number, cScore: number, aggScore: number, count: number }> = {};
    
    sessions.forEach(s => {
      if (!domainData[s.domain]) domainData[s.domain] = { tScore: 0, cScore: 0, aggScore: 0, count: 0 };
      if (s.round1.scores && s.round1.scores.length > 0) {
        const tAvg = s.round1.scores.reduce((acc, sc) => acc + sc.technicalScore, 0) / s.round1.scores.length;
        const cAvg = s.round1.scores.reduce((acc, sc) => acc + sc.communicationScore, 0) / s.round1.scores.length;
        const aggAvg = s.round1.scores.reduce((acc, sc) => acc + sc.aggregateScore, 0) / s.round1.scores.length;
        
        domainData[s.domain].tScore += tAvg;
        domainData[s.domain].cScore += cAvg;
        domainData[s.domain].aggScore += aggAvg;
        domainData[s.domain].count += 1;
      }
    });

    return Object.keys(domainData).map(domain => ({
      domain,
      avgTechnical: domainData[domain].count ? domainData[domain].tScore / domainData[domain].count : 0,
      avgCommunication: domainData[domain].count ? domainData[domain].cScore / domainData[domain].count : 0,
      avgAggregate: domainData[domain].count ? domainData[domain].aggScore / domainData[domain].count : 0,
      count: domainData[domain].count
    }));
  },

  async getImprovementTrends(userId: string) {
    const sessions = await DB.getSessions();
    const sorted = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
    
    return sorted.filter(s => s.round1.scores && s.round1.scores.length > 0).map(s => {
      const avgScore = s.round1.scores.reduce((acc, sc) => acc + sc.aggregateScore, 0) / s.round1.scores.length;
      return {
        date: s.startedAt,
        avgScore
      };
    });
  },

  async getWeaknessAnalysis(userId: string) {
    const feedback = await DB.getAllUserFeedback();
    const weaknessCounts: Record<string, number> = {};
    
    feedback.forEach(f => {
      f.missingKeywords.forEach(kw => {
        const lowerKw = kw.toLowerCase();
        weaknessCounts[lowerKw] = (weaknessCounts[lowerKw] || 0) + 1;
      });
    });

    const entries = Object.keys(weaknessCounts).map(keyword => ({
      keyword,
      missCount: weaknessCounts[keyword]
    }));

    return entries.sort((a, b) => b.missCount - a.missCount).slice(0, 10);
  }
};
