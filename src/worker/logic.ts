import { getLogger } from "@/lib/logger"

const logger = getLogger('logic');

export const demoLogic = () => {
    logger.info('Demo logic executed');
}