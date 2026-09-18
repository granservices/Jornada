export const CHAT_IDENTITY_PORT = Symbol('CHAT_IDENTITY_PORT');

export type ChatActorSnapshot = {
  actorType: 'USER' | 'TEAM' | 'SYSTEM' | 'EXTERNAL';
  actorId: string;
  displayName: string;
};

export interface ChatIdentityPort {
  resolveUser(userId: string): Promise<ChatActorSnapshot>;
}
