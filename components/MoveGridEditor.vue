<template>
    <div class="space-y-3">
        <div class="flex justify-between items-center">
            <h4 class="text-sm font-semibold">Move table (editable)</h4>
            <div class="space-x-2">
                <button class="px-2 py-1 text-xs bg-blue-600 text-white rounded"
                        @click="$emit('apply', localRows)">Apply changes</button>
                <button class="px-2 py-1 text-xs bg-gray-200 rounded"
                        @click="reset">Reset</button>
            </div>
        </div>

        <div class="overflow-x-auto border rounded">
            <table class="min-w-full text-sm">
                <thead class="bg-gray-50">
                <tr>
                    <th class="px-2 py-1 w-12 text-left">#</th>
                    <th class="px-2 py-1">White</th>
                    <th class="px-2 py-1">Black</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(r, i) in localRows" :key="i"
                    :class="rowHasIssue(r) ? 'bg-red-50' : ''">
                    <td class="px-2 py-1">
                        <input class="w-14 border rounded px-1" type="number" min="1" max="999"
                               v-model.number="r.n" />
                    </td>
                    <td class="px-2 py-1">
                        <input class="w-full border rounded px-2 py-1 font-mono"
                               v-model="r.w" placeholder="e4 / Nf3 / O-O" />
                    </td>
                    <td class="px-2 py-1">
                        <input class="w-full border rounded px-2 py-1 font-mono"
                               v-model="r.b" placeholder="e5 / Nc6 / O-O" />
                    </td>
                </tr>
                </tbody>
            </table>
        </div>

        <details v-if="issues?.length" class="text-xs">
            <summary class="cursor-pointer text-blue-600">Issues (from OCR/validation)</summary>
            <ul class="mt-2 list-disc ml-5 space-y-1">
                <li v-for="(iss, idx) in issues" :key="idx" class="font-mono">
                    ply {{ iss.ply }} — {{ iss.token }} ({{ iss.reason }})
                </li>
            </ul>
        </details>

        <div class="flex items-center gap-2 text-xs text-gray-600">
            <span class="inline-block w-3 h-3 bg-red-50 border"></span>
            Row flagged by an issue (ply index may not equal row number).
        </div>
    </div>
</template>

<script setup lang="ts">
type Row = { n:number; w:string; b:string }
type Issue = { ply:number; token:string; reason:string }

const props = defineProps<{
    rows: Row[]
    issues?: Issue[]
}>()
const emit = defineEmits<{ (e:'apply', rows:Row[]):void }>()

const localRows = ref<Row[]>(structuredClone(props.rows ?? []))
const issues = computed(()=> props.issues ?? [])

watch(() => props.rows, (v)=> {
    localRows.value = structuredClone(v ?? [])
})

function rowHasIssue(r: Row) {
    // Rough highlight: if an issue token equals current w/b or its ply maps near this row
    return issues.value?.some(i =>
        (i.token && (i.token === r.w || i.token === r.b))
    )
}

function reset() {
    localRows.value = structuredClone(props.rows ?? [])
}
</script>