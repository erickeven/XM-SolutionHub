import { z } from 'zod';

export const selectionInputSchema = z
  .object({
    inputVoltageMin: z.number().min(0),
    inputVoltageMax: z.number().min(0),
    outputVoltage: z.number().positive(),
    outputCurrent: z.number().positive(),
    applicationType: z.string().trim().optional().default(''),
    efficiencyLevel: z.string().optional(),
    standbyPowerMax: z.number().optional(),
    maxAmbientTemp: z.number().optional(),
    pcbaSize: z
      .object({
        width: z.number(),
        height: z.number(),
      })
      .optional(),
    certifications: z.array(z.string()).optional(),
    requiresPfc: z.boolean().optional(),
  })
  .refine((data) => data.inputVoltageMin <= data.inputVoltageMax, {
    message: 'inputVoltageMin must be <= inputVoltageMax',
    path: ['inputVoltageMax'],
  });

export type SelectionInputParsed = z.infer<typeof selectionInputSchema>;
