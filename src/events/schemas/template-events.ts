export enum TemplateEventType {
  TEMPLATE_CREATED = 'template.created',
  TEMPLATE_UPDATED = 'template.updated',
  TEMPLATE_DELETED = 'template.deleted',
  TEMPLATE_VERSION_CREATED = 'template.version.created',
}

export interface BaseTemplateEvent {
  eventType: TemplateEventType;
  timestamp: string;
  correlationId?: string;
  tenantId: number;
}

export interface TemplateCreatedEvent extends BaseTemplateEvent {
  eventType: TemplateEventType.TEMPLATE_CREATED;
  data: {
    templateId: number;
    uuid: string;
    templateCode: string;
    name: string;
    channel: string;
    language: string;
    createdBy: string;
  };
}

export interface TemplateUpdatedEvent extends BaseTemplateEvent {
  eventType: TemplateEventType.TEMPLATE_UPDATED;
  data: {
    templateId: number;
    uuid: string;
    templateCode: string;
    version: number;
    updatedBy: string;
    changes: string[];
  };
}

export interface TemplateDeletedEvent extends BaseTemplateEvent {
  eventType: TemplateEventType.TEMPLATE_DELETED;
  data: {
    templateId: number;
    uuid: string;
    templateCode: string;
    deletedBy: string;
  };
}

export type TemplateEvent =
  | TemplateCreatedEvent
  | TemplateUpdatedEvent
  | TemplateDeletedEvent;
