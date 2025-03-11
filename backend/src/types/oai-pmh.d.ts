declare module 'oai-pmh' {
  export interface Header {
    identifier: string;
    datestamp: string;
    setSpec?: string[];
  }

  export interface Record {
    header: Header;
    metadata: any;
    about?: any;
  }
  
  export interface ListIdentifiersOptions {
    from?: string;
    until?: string;
    metadataPrefix?: string;
    set?: string;
    resumptionToken?: string;
  }
  
  export interface ListRecordsOptions extends ListIdentifiersOptions {}
  
  export class OaiPmh {
    constructor(baseUrl: string);
    
    identify(): Promise<any>;
    listMetadataFormats(identifier?: string): Promise<any>;
    listSets(): Promise<any>;
    listIdentifiers(options: ListIdentifiersOptions): Promise<Header[]>;
    listRecords(options: ListRecordsOptions): Promise<Record[]>;
    getRecord(identifier: string, metadataPrefix: string): Promise<Record>;
  }
}
