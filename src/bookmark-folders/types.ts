/**
 * Types for bookmark folder management
 */

export interface FolderMapping {
  [folderId: string]: string; // folderId -> tag name
}

export interface FolderConfig {
  folders: FolderMapping;
  fetchFromFolders: boolean;
}

export interface BookmarkWithFolder {
  id: string;
  folderId?: string;
  folderName?: string;
}
