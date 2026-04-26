SET search_path TO public;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Crosshair' AND column_name='previewColor') THEN
    ALTER TABLE "Crosshair" ADD COLUMN "previewColor" TEXT DEFAULT '#00ff00';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Crosshair' AND column_name='previewSize') THEN
    ALTER TABLE "Crosshair" ADD COLUMN "previewSize" FLOAT DEFAULT 5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Crosshair' AND column_name='previewGap') THEN
    ALTER TABLE "Crosshair" ADD COLUMN "previewGap" FLOAT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Crosshair' AND column_name='previewThick') THEN
    ALTER TABLE "Crosshair" ADD COLUMN "previewThick" FLOAT DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Crosshair' AND column_name='previewDot') THEN
    ALTER TABLE "Crosshair" ADD COLUMN "previewDot" BOOLEAN DEFAULT false;
  END IF;
END
$$;
