import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../lib/errors';
import { successResponse } from '../../lib/response';
import { createRoleSchema, updateRoleSchema } from './rbac.schema';
import * as service from './rbac.service';

export async function listPermissionsHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const groups = await service.listPermissions();
    res.status(200).json(successResponse(groups));
  } catch (err) {
    next(err);
  }
}

export async function listRolesHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const roles = await service.listRoles();
    res.status(200).json(successResponse(roles));
  } catch (err) {
    next(err);
  }
}

export async function getRoleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id;
    if (!id) throw new AppError(1002, 'Missing role id', 400);
    const role = await service.getRole(id);
    res.status(200).json(successResponse(role));
  } catch (err) {
    next(err);
  }
}

export async function createRoleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createRoleSchema.parse(req.body);
    const role = await service.createRole(input);
    res.status(201).json(successResponse(role));
  } catch (err) {
    next(err);
  }
}

export async function updateRoleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id;
    if (!id) throw new AppError(1002, 'Missing role id', 400);
    const input = updateRoleSchema.parse(req.body);
    const role = await service.updateRole(id, input);
    res.status(200).json(successResponse(role));
  } catch (err) {
    next(err);
  }
}

export async function deleteRoleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id;
    if (!id) throw new AppError(1002, 'Missing role id', 400);
    await service.deleteRole(id);
    res.status(200).json(successResponse({ id }));
  } catch (err) {
    next(err);
  }
}
