import { ObjectId } from 'mongodb';

export function serializeAnswerId(id: ObjectId | string): string {
  if (typeof id === 'string') {
    return id;
  }
  return id.toHexString();
}
