import { Prisma } from "@prisma/client"


export class MessageRepository {
    create(dto: Prisma.MessageCreateInput) {
        
        return Promise<null>
    }

    findById(id: any) {return null }
}