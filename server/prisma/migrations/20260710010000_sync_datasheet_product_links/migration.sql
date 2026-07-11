WITH ranked_datasheets AS (
  SELECT
    product.id,
    ROW_NUMBER() OVER (
      PARTITION BY product."datasheetMaterialId"
      ORDER BY
        CASE WHEN material."productId" = product.id THEN 0 ELSE 1 END,
        product."createdAt",
        product.id
    ) AS row_number
  FROM "Product" AS product
  LEFT JOIN "Material" AS material
    ON material.id = product."datasheetMaterialId"
  WHERE product."datasheetMaterialId" IS NOT NULL
)
UPDATE "Product" AS product
SET "datasheetMaterialId" = NULL
FROM ranked_datasheets
WHERE product.id = ranked_datasheets.id
  AND ranked_datasheets.row_number > 1;

UPDATE "Material" AS material
SET "productId" = product.id
FROM "Product" AS product
WHERE product."datasheetMaterialId" = material.id;

CREATE UNIQUE INDEX "Product_datasheetMaterialId_key"
ON "Product"("datasheetMaterialId");

UPDATE product_field_configs
SET label = '最大待机功耗(W)', "updatedAt" = NOW()
WHERE "resourceType" = 'product'
  AND "fieldKey" = 'standbyPowerMax'
  AND label = '最大待机功耗(mW)';
