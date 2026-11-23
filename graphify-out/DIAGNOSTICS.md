# Graphify diagnostics

Graphify excluded 140 unresolved edge candidates and 24 self-loop candidates. An unresolved candidate has at least one endpoint outside the final graph. The undirected visualization uses one edge per pair of nodes. The extraction audit retains resolved relationship records before that reduction.

The follow-up added 6 browser event and handler nodes and 31 source-verified links. The links cover tab events, reader actions, worker dispatch, card rendering, and offline registration.

```text
[graphify] MultiDiGraph edge-collapse diagnostic
input: <in-memory>
input_stage: provided JSON (normal graph.json is post-build)
effective_directed: <direct-call>
nodes: 2358
unverified_code_nodes: 0
raw_edges: 4652
valid_candidate_edges: 4652
missing_endpoint_edges: 0
dangling_endpoint_edges: 0
external_reference_edges: 0
self_loop_edges: 0
exact_duplicate_edges: 0
directed_unique_endpoint_pairs: 4567
directed_same_endpoint_collapsed_edges: 85
undirected_unique_endpoint_pairs: 4564
undirected_same_endpoint_collapsed_edges: 88
same_endpoint_group_count: 81
relation_variant_groups: 81
source_file_variant_groups: 0
source_location_variant_groups: 0
context_variant_groups: 0
post_build_graph_type: Graph
post_build_edges: 4550
producer_suppression_sites: 12
producer_suppression_examples:
  - L1648 seen_ids arity=unknown
  - L2181 seen_ids arity=unknown
  - L2183 seen_doc_refs arity=unknown
  - L2553 seen_ids arity=unknown
  - L2700 seen_ids arity=unknown
  - L3426 seen_keys arity=unknown
  - L3595 seen_keys arity=unknown
  - L5671 seen_ids arity=unknown
examples:
  - bookmarks_folderlistcontents -> bookmarks_folderlistcontents_paint edges=3 relations=['calls', 'contains', 'indirect_call'] locations=['L838', 'L848'] contexts=['', 'argument', 'call']
  - script_askdialog -> script_askdialog_submit edges=3 relations=['calls', 'contains', 'indirect_call'] locations=['L1487', 'L1499', 'L1501'] contexts=['', 'argument', 'call']
  - tests_parity_test -> tests_parity_test_uuid edges=3 relations=['calls', 'contains', 'indirect_call'] locations=['L117', 'L120', 'L123'] contexts=['', 'call', 'collection']
  - vendor_sqljs_sql_wasm -> vendor_sqljs_sql_wasm_c edges=3 relations=['calls', 'contains', 'indirect_call'] locations=['L140', 'L157', 'L74'] contexts=['', 'argument', 'call']
  - bookmarks -> bookmarks_refreshsavebutton edges=2 relations=['calls', 'contains'] locations=['L230', 'L313'] contexts=['', 'call']
note: normal graph.json is post-build; raw producer loss must be measured earlier.
```
