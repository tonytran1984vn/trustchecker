const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const classificationEngine = require('../engines/classification-engine');

/**
 * CLASSIFICATION SERVICE
 * Orchestrates DB interactions, event emissions, and engine invocations.
 */
class ClassificationService {
    /**
     * Helper to emit structured Classification Events
     */
    async logClassificationEvent(orgId, dataAssetId, action, labels, actorId = 'system') {
        try {
            await prisma.classificationEvent.create({
                data: {
                    orgId,
                    dataAssetId,
                    action,
                    labels,
                    actor: actorId,
                },
            });
            // Also emit via standard event emitter or queue for external consumers
            // e.g. eventBus.emit('data.classified', { ... })
        } catch (error) {
            console.error('Failed to log classification event:', error);
        }
    }

    /**
     * Snapshot an asset before classification changes to track data drift
     */
    async snapshotDataAsset(dataAssetId, payload) {
        try {
            const hash = classificationEngine.hashPayload(payload);
            await prisma.dataAssetSnapshot.create({
                data: {
                    dataAssetId,
                    payloadHash: hash,
                    snapshot: payload,
                },
            });
        } catch (error) {
            console.error('Failed to create snapshot:', error);
        }
    }

    /**
     * Process auto-classification for a given data asset payload
     */
    async evaluateAndTagAsset(dataAssetId, orgId, payload, actorId = 'system') {
        try {
            // 1. Snapshot the payload
            await this.snapshotDataAsset(dataAssetId, payload);

            // 2. Evaluate rules
            const labelIds = await classificationEngine.evaluateClassification(orgId, payload);

            // 3. Clear old system tags and apply new ones
            await prisma.$transaction(async tx => {
                // Remove previous 'system' tags if re-evaluating
                await tx.dataClassification.deleteMany({
                    where: { dataAssetId, taggedBy: 'system' },
                });

                // Apply new classifications
                if (labelIds.length > 0) {
                    await tx.dataClassification.createMany({
                        data: labelIds.map(labelId => ({
                            dataAssetId,
                            labelId,
                            confidence: 1.0,
                            taggedBy: 'system',
                        })),
                    });
                }
            });

            // 4. Emit structured event
            await this.logClassificationEvent(orgId, dataAssetId, 'auto_tagged', labelIds, actorId);

            return labelIds;
        } catch (error) {
            console.error('Error in evaluateAndTagAsset:', error);
            throw error;
        }
    }

    /**
     * Manually tag a data asset
     */
    async manualTagAsset(dataAssetId, orgId, labelIds, actorId) {
        try {
            // We just append/override manual tags
            await prisma.$transaction(async tx => {
                await tx.dataClassification.createMany({
                    data: labelIds.map(labelId => ({
                        dataAssetId,
                        labelId,
                        confidence: 1.0,
                        taggedBy: actorId,
                    })),
                    skipDuplicates: true,
                });
            });

            await this.logClassificationEvent(orgId, dataAssetId, 'tagged', labelIds, actorId);
            return true;
        } catch (error) {
            console.error('Error in manualTagAsset:', error);
            throw error;
        }
    }
}

module.exports = new ClassificationService();
