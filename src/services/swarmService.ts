import { Bee, NULL_STAMP, SWARM_GATEWAY_URL } from '@ethersphere/bee-js'

export class SwarmService {
    private bee: Bee

    constructor() {
        // Use public Swarm gateway with NULL_STAMP for testing
        this.bee = new Bee(SWARM_GATEWAY_URL)
    }

    async uploadData(content: string): Promise<string> {
        try {
            const { reference } = await this.bee.uploadData(NULL_STAMP, content)
            return reference.toHex()
        } catch (error) {
            console.error('Failed to upload data to Swarm:', error)
            throw new Error('Failed to upload content to Swarm')
        }
    }

    async downloadData(reference: string): Promise<string> {
        try {
            const data = await this.bee.downloadData(reference)
            return data.toUtf8()
        } catch (error) {
            console.error('Failed to download data from Swarm:', error)
            throw new Error('Failed to download content from Swarm')
        }
    }
}

// Export singleton instance
export const swarmService = new SwarmService()
