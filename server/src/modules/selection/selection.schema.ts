import { z } from 'zod';

export const selectionInputSchema = z
  .object({
    inputVoltageMin: z.number(),
    inputVoltageMax: z.number(),
    outputVoltage: z.number(),
    outputCurrent: z.number(),
    applicationType: z.string().min(1),
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