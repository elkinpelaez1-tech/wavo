export interface MetaWebhookPayload {
  object: string;
  entry: Entry[];
}
export interface Entry {
  id: string;
  changes: Change[];
}
export interface Change {
  value: ChangeValue;
  field: string;
}
export interface ChangeValue {
  messaging_product: string;
  metadata: { display_phone_number: string; phone_number_id: string };
  statuses?: MessageStatus[];
  messages?: IncomingMessage[];
}
export interface MessageStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: { code: number; title: string }[];
}
export interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  context?: { id: string; from?: string };
  button?: { text: string; payload?: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
  [key: string]: any;
}
