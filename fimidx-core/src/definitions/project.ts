import { z } from "zod";
import {
  numberMetaQuerySchema,
  objSortListSchema,
  stringMetaQuerySchema,
} from "./obj.js";

export interface IProject {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  createdByType: string;
  updatedBy: string;
  updatedByType: string;
  orgId: string;
  objFieldsToIndex: string[] | null;
}

export interface IProjectObjRecord {
  name: string;
  description?: string | null;
  orgId: string;
  objFieldsToIndex: string[] | null;
}

export const addProjectSchema = z.object({
  orgId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  objFieldsToIndex: z.array(z.string()).optional(),
});

export const projectQuerySchema = z.object({
  orgId: z.string().min(1),
  id: stringMetaQuerySchema.optional(),
  name: stringMetaQuerySchema.optional(),
  createdAt: numberMetaQuerySchema.optional(),
  updatedAt: numberMetaQuerySchema.optional(),
  createdBy: stringMetaQuerySchema.optional(),
  updatedBy: stringMetaQuerySchema.optional(),
});

export const updateProjectsSchema = z.object({
  query: projectQuerySchema,
  update: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    objFieldsToIndex: z.array(z.string().min(1)).optional().nullable(),
  }),
  updateMany: z.boolean().optional(),
});

export const deleteProjectsSchema = z.object({
  query: projectQuerySchema,
  deleteMany: z.boolean().optional(),
});

export const getProjectsSchema = z.object({
  query: projectQuerySchema,
  page: z.number().optional(),
  limit: z.number().optional(),
  sort: objSortListSchema.optional(),
});

export type AddProjectEndpointArgs = z.infer<typeof addProjectSchema>;
export type UpdateProjectsEndpointArgs = z.infer<typeof updateProjectsSchema>;
export type DeleteProjectsEndpointArgs = z.infer<typeof deleteProjectsSchema>;
export type GetProjectsEndpointArgs = z.infer<typeof getProjectsSchema>;

export interface AddProjectEndpointResponse {
  project: IProject;
}

export interface GetProjectsEndpointResponse {
  projects: IProject[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface GetProjectEndpointResponse {
  project: IProject;
}

export interface UpdateProjectEndpointResponse {
  success: boolean;
}
