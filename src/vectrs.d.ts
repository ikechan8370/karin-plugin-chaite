declare module 'vectra' {
    export class LocalIndex {
      constructor(indexFile: string);
      isIndexCreated(): Promise<boolean>;
      createIndex(): Promise<void>;
      insertItem(item: { vector: number[], id: string, metadata: any }): Promise<void>;
      queryItems(vector: number[], k: number): Promise<Array<{ item: { id: string, vector: number[], metadata: any }, score: number }>>;
      getItem(id: string): Promise<{ id: string, vector: number[], metadata: any } | null>;
      deleteItem(id: string): Promise<void>;
      upsertItem(item: { id: string, vector: number[], metadata: any }): Promise<void>;
      getIndexStats(): Promise<{ items: number }>;
      deleteIndex(): Promise<void>;
    }
  }