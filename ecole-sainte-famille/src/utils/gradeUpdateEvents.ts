/**
 * Système d'événements pour la mise à jour en temps réel des bulletins
 * quand les notes sont modifiées
 */

interface GradeUpdateEvent {
  studentId: number;
  classId: number;
  subjectId: number;
  compositionId: number;
  newGrade: number;
  isPublished: boolean;
  timestamp: number;
}

interface BulletinRefreshEvent {
  studentIds: number[];
  classId: number;
  compositionId?: number;
  subjectId?: number;
  timestamp: number;
}

class GradeUpdateEventManager {
  private eventTarget: EventTarget;

  constructor() {
    this.eventTarget = new EventTarget();
  }

  // Émettre un événement de mise à jour de note
  emitGradeUpdate(data: GradeUpdateEvent) {
    const event = new CustomEvent('gradeUpdated', {
      detail: data
    });
    this.eventTarget.dispatchEvent(event);
    console.log('📡 [GRADE EVENTS] Note mise à jour émise:', data);
  }

  // Émettre un événement de rafraîchissement de bulletin
  emitBulletinRefresh(data: BulletinRefreshEvent) {
    const event = new CustomEvent('bulletinRefresh', {
      detail: data
    });
    this.eventTarget.dispatchEvent(event);
    console.log('🔄 [GRADE EVENTS] Rafraîchissement bulletin émis:', data);
  }

  // Écouter les mises à jour de notes
  onGradeUpdate(callback: (data: GradeUpdateEvent) => void) {
    const handler = (event: any) => {
      callback(event.detail);
    };
    this.eventTarget.addEventListener('gradeUpdated', handler);
    
    // Retourner une fonction de nettoyage
    return () => {
      this.eventTarget.removeEventListener('gradeUpdated', handler);
    };
  }

  // Écouter les demandes de rafraîchissement de bulletin
  onBulletinRefresh(callback: (data: BulletinRefreshEvent) => void) {
    const handler = (event: any) => {
      callback(event.detail);
    };
    this.eventTarget.addEventListener('bulletinRefresh', handler);
    
    // Retourner une fonction de nettoyage
    return () => {
      this.eventTarget.removeEventListener('bulletinRefresh', handler);
    };
  }

  // Méthode utilitaire pour déclencher un rafraîchissement de bulletin
  // après une série de mises à jour de notes
  triggerBulletinRefresh(studentIds: number[], classId: number, compositionId?: number, subjectId?: number) {
    // Attendre un peu pour permettre à toutes les notes d'être sauvegardées
    setTimeout(() => {
      this.emitBulletinRefresh({
        studentIds,
        classId,
        compositionId,
        subjectId,
        timestamp: Date.now()
      });
    }, 500); // Délai de 500ms pour permettre la sauvegarde
  }
}

// Instance singleton
export const gradeEventManager = new GradeUpdateEventManager();

export type { GradeUpdateEvent, BulletinRefreshEvent };
